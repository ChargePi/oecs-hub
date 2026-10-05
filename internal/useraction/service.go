package useraction

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("useraction.service")

// DefaultTTL is how long a proposed action waits for the user's decision.
const DefaultTTL = 15 * time.Minute

// UserChargers is the subset of userchargers.Service an action validates against and
// finally executes through. Every call carries the caller's ctx, so the paid-plan check
// for projects resolves the same identity the request came in with.
type UserChargers interface {
	SetFavorite(ctx context.Context, identityID, variantID uuid.UUID, favorited bool) (bool, error)
	CreateProject(ctx context.Context, identityID uuid.UUID, name string, description *string) (*userchargers.Project, error)
	GetProject(ctx context.Context, identityID, id uuid.UUID) (*userchargers.Project, []userchargers.ProjectChargerEntry, error)
	ManageChargers(ctx context.Context, identityID, id uuid.UUID, changes []userchargers.ChargerChange, ordering []uuid.UUID) (*userchargers.Project, []userchargers.ProjectChargerEntry, error)
	SubmitRating(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []userchargers.RatingInput) (userchargers.RatingsSummary, error)
}

// ChargerReader resolves charger ids to catalogue entries for validation and summaries.
// Implemented by *charger.Service, which omits ids that aren't verified chargers.
type ChargerReader interface {
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error)
}

// PaidPlanChecker gates project creation, which has no existing project to check
// ownership (and with it, the plan) against. Implemented by *entitlement.Service.
type PaidPlanChecker interface {
	HasPaidPlan(ctx context.Context) (bool, error)
}

type Service struct {
	store        Store
	userChargers UserChargers
	chargers     ChargerReader
	plans        PaidPlanChecker
	ttl          time.Duration
	now          func() time.Time
}

func NewService(store Store, userChargers UserChargers, chargers ChargerReader, plans PaidPlanChecker, ttl time.Duration) *Service {
	if ttl <= 0 {
		ttl = DefaultTTL
	}

	return &Service{store: store, userChargers: userChargers, chargers: chargers, plans: plans, ttl: ttl, now: time.Now}
}

// ProposeFavorite validates and stores a pending favorite/unfavorite of variantID.
func (s *Service) ProposeFavorite(ctx context.Context, variantID uuid.UUID, favorited bool) (*Action, error) {
	ctx, span := tracer.Start(ctx, "useraction.ProposeFavorite", trace.WithAttributes(variantAttr(variantID)))
	defer span.End()

	names, err := s.chargerNames(ctx, []uuid.UUID{variantID}, true)
	if err != nil {
		return nil, fail(span, err)
	}

	summary := fmt.Sprintf("Add %s to your favorites", names[variantID])
	if !favorited {
		summary = fmt.Sprintf("Remove %s from your favorites", names[variantID])
	}

	return s.save(ctx, span, KindFavorite, summary, func(a *Action) {
		a.Favorite = &FavoritePayload{VariantID: variantID, Favorited: favorited}
	})
}

// ProposeProject validates and stores a pending project edit or creation. Only add and
// remove changes are accepted; added chargers must be verified, and removed ones must
// currently be in the project.
func (s *Service) ProposeProject(ctx context.Context, payload ProjectPayload) (*Action, error) {
	ctx, span := tracer.Start(ctx, "useraction.ProposeProject")
	defer span.End()

	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return nil, fail(span, err)
	}

	if (payload.ProjectID == nil) == (payload.NewProject == nil) {
		return nil, fail(span, fmt.Errorf("%w: set exactly one of project id and new project", ErrInvalidAction))
	}

	if payload.ProjectID != nil && len(payload.Changes) == 0 {
		return nil, fail(span, fmt.Errorf("%w: no charger changes for the project", ErrInvalidAction))
	}

	var added, removed []uuid.UUID

	for _, change := range payload.Changes {
		switch change.Action {
		case userchargers.ChargerChangeAdd:
			added = append(added, change.ChargerVariantID)
		case userchargers.ChargerChangeRemove:
			removed = append(removed, change.ChargerVariantID)
		default:
			return nil, fail(span, fmt.Errorf("%w: unsupported charger change %q", ErrInvalidAction, change.Action))
		}
	}

	var (
		projectName string
		members     map[uuid.UUID]bool
	)

	if payload.NewProject != nil {
		if len(removed) > 0 {
			return nil, fail(span, fmt.Errorf("%w: a new project has no chargers to remove", ErrInvalidAction))
		}

		name, err := userchargers.ValidateProjectName(payload.NewProject.Name)
		if err != nil {
			return nil, fail(span, err)
		}

		payload.NewProject.Name = name
		projectName = name

		if err := s.requirePaidPlan(ctx); err != nil {
			return nil, fail(span, err)
		}
	} else {
		// GetProject is owner-scoped and paid-plan gated, so this one call checks both.
		project, entries, err := s.userChargers.GetProject(ctx, ownerID, *payload.ProjectID)
		if err != nil {
			return nil, fail(span, err)
		}

		projectName = project.Name
		members = make(map[uuid.UUID]bool, len(entries))

		for _, member := range project.Chargers {
			members[member.ChargerVariantID] = true
		}
	}

	for _, id := range removed {
		if !members[id] {
			return nil, fail(span, fmt.Errorf("%w: charger %s is not in project %q", ErrInvalidAction, id, projectName))
		}
	}

	addedNames, err := s.chargerNames(ctx, added, true)
	if err != nil {
		return nil, fail(span, err)
	}

	// A removed charger may since have been unverified - fall back to its id for the
	// summary rather than refusing to let the user clean it out of their project.
	removedNames, err := s.chargerNames(ctx, removed, false)
	if err != nil {
		return nil, fail(span, err)
	}

	summary := projectSummary(payload, projectName, namesOf(added, addedNames), namesOf(removed, removedNames))

	return s.save(ctx, span, KindProject, summary, func(a *Action) {
		a.Project = &payload
	})
}

// ProposeRating validates and stores a pending rating of variantID.
func (s *Service) ProposeRating(ctx context.Context, variantID uuid.UUID, ratings []userchargers.RatingInput) (*Action, error) {
	ctx, span := tracer.Start(ctx, "useraction.ProposeRating", trace.WithAttributes(variantAttr(variantID)))
	defer span.End()

	if len(ratings) == 0 {
		return nil, fail(span, fmt.Errorf("%w: at least one category score is required", ErrInvalidAction))
	}

	if err := userchargers.ValidateRatingInputs(ratings); err != nil {
		return nil, fail(span, err)
	}

	names, err := s.chargerNames(ctx, []uuid.UUID{variantID}, true)
	if err != nil {
		return nil, fail(span, err)
	}

	scores := make([]string, 0, len(ratings))
	for _, r := range ratings {
		scores = append(scores, fmt.Sprintf("%s %d/5", strings.ReplaceAll(r.CategoryName, "_", " "), r.Score))
	}

	summary := fmt.Sprintf("Rate %s: %s", names[variantID], strings.Join(scores, ", "))

	return s.save(ctx, span, KindRating, summary, func(a *Action) {
		a.Rating = &RatingPayload{VariantID: variantID, Ratings: ratings}
	})
}

// Get returns one of the caller's actions.
func (s *Service) Get(ctx context.Context, id uuid.UUID) (*State, error) {
	ctx, span := tracer.Start(ctx, "useraction.Get", trace.WithAttributes(actionAttr(id)))
	defer span.End()

	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return nil, fail(span, err)
	}

	state, err := s.store.Get(ctx, ownerID, id)
	if err != nil {
		return nil, fail(span, err)
	}

	return state, nil
}

// ListByConversation returns the caller's unexpired actions in a conversation. Another
// user's conversation id simply yields nothing, so the hub never needs to know who owns a
// conversation.
func (s *Service) ListByConversation(ctx context.Context, conversationID string) ([]State, error) {
	ctx, span := tracer.Start(ctx, "useraction.ListByConversation")
	defer span.End()

	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return nil, fail(span, err)
	}

	if conversationID == "" {
		return nil, fail(span, fmt.Errorf("%w: conversation id is required", ErrInvalidAction))
	}

	states, err := s.store.ListByConversation(ctx, ownerID, conversationID)
	if err != nil {
		return nil, fail(span, err)
	}

	return states, nil
}

// Confirm claims the caller's pending action and executes it. A second Confirm (or one
// racing a Reject) loses the claim and gets ErrNotPending without running anything. If the
// write itself fails the action is marked failed and the write's error is returned.
func (s *Service) Confirm(ctx context.Context, id uuid.UUID) (*State, error) {
	ctx, span := tracer.Start(ctx, "useraction.Confirm", trace.WithAttributes(actionAttr(id)))
	defer span.End()

	state, err := s.decide(ctx, id, StatusConfirmed)
	if err != nil {
		return nil, fail(span, err)
	}

	if err := s.execute(ctx, &state.Action); err != nil {
		if markErr := s.store.MarkFailed(ctx, &state.Action); markErr != nil {
			span.RecordError(markErr)
		}

		return nil, fail(span, err)
	}

	return state, nil
}

// Reject declines the caller's pending action. Nothing runs.
func (s *Service) Reject(ctx context.Context, id uuid.UUID) (*State, error) {
	ctx, span := tracer.Start(ctx, "useraction.Reject", trace.WithAttributes(actionAttr(id)))
	defer span.End()

	state, err := s.decide(ctx, id, StatusRejected)
	if err != nil {
		return nil, fail(span, err)
	}

	return state, nil
}

func (s *Service) decide(ctx context.Context, id uuid.UUID, decision Status) (*State, error) {
	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return nil, err
	}

	state, err := s.store.Get(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}

	claimed, current, err := s.store.Decide(ctx, &state.Action, decision)
	if err != nil {
		return nil, err
	}

	if !claimed {
		return nil, fmt.Errorf("%w: %s", ErrNotPending, current)
	}

	state.Status = decision

	return state, nil
}

func (s *Service) execute(ctx context.Context, action *Action) error {
	switch action.Kind {
	case KindFavorite:
		_, err := s.userChargers.SetFavorite(ctx, action.OwnerID, action.Favorite.VariantID, action.Favorite.Favorited)

		return err
	case KindProject:
		projectID := action.Project.ProjectID

		if action.Project.NewProject != nil {
			project, err := s.userChargers.CreateProject(ctx, action.OwnerID, action.Project.NewProject.Name, action.Project.NewProject.Description)
			if err != nil {
				return err
			}

			projectID = &project.ID
		}

		if len(action.Project.Changes) == 0 {
			return nil
		}

		_, _, err := s.userChargers.ManageChargers(ctx, action.OwnerID, *projectID, action.Project.Changes, nil)

		return err
	case KindRating:
		_, err := s.userChargers.SubmitRating(ctx, action.Rating.VariantID, action.OwnerID, action.Rating.Ratings)

		return err
	default:
		return fmt.Errorf("%w: unknown kind %q", ErrInvalidAction, action.Kind)
	}
}

func (s *Service) save(ctx context.Context, span trace.Span, kind Kind, summary string, setPayload func(*Action)) (*Action, error) {
	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return nil, fail(span, err)
	}

	action := &Action{
		ID:             uuid.New(),
		OwnerID:        ownerID,
		ConversationID: ConversationIDFromContext(ctx),
		Kind:           kind,
		Summary:        summary,
		ExpiresAt:      s.now().Add(s.ttl),
	}
	setPayload(action)

	span.SetAttributes(actionAttr(action.ID))

	if err := s.store.Save(ctx, action); err != nil {
		return nil, fail(span, err)
	}

	return action, nil
}

func (s *Service) requirePaidPlan(ctx context.Context) error {
	paid, err := s.plans.HasPaidPlan(ctx)
	if err != nil {
		return fmt.Errorf("check plan: %w", err)
	}

	if !paid {
		return userchargers.ErrPaidPlanRequired
	}

	return nil
}

// chargerNames resolves ids to display names. With requireVerified, an id that isn't a
// verified charger is ErrVariantNotFound; otherwise it is simply absent from the result.
func (s *Service) chargerNames(ctx context.Context, ids []uuid.UUID, requireVerified bool) (map[uuid.UUID]string, error) {
	names := make(map[uuid.UUID]string, len(ids))
	if len(ids) == 0 {
		return names, nil
	}

	chargers, err := s.chargers.GetMany(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("get chargers: %w", err)
	}

	for _, c := range chargers {
		names[c.ID] = displayName(c)
	}

	if requireVerified {
		for _, id := range ids {
			if _, ok := names[id]; !ok {
				return nil, fmt.Errorf("%w: %s", userchargers.ErrVariantNotFound, id)
			}
		}
	}

	return names, nil
}

func displayName(c *charger.Charger) string {
	return strings.TrimSpace(strings.Join([]string{c.ManufacturerName, c.ModelName}, " "))
}

func namesOf(ids []uuid.UUID, names map[uuid.UUID]string) []string {
	out := make([]string, 0, len(ids))

	for _, id := range ids {
		if name, ok := names[id]; ok {
			out = append(out, name)
		} else {
			out = append(out, id.String())
		}
	}

	return out
}

func projectSummary(payload ProjectPayload, projectName string, added, removed []string) string {
	if payload.NewProject != nil {
		if len(added) == 0 {
			return fmt.Sprintf("Create project %q", projectName)
		}

		return fmt.Sprintf("Create project %q with %s", projectName, strings.Join(added, ", "))
	}

	var parts []string
	if len(added) > 0 {
		parts = append(parts, "add "+strings.Join(added, ", "))
	}

	if len(removed) > 0 {
		parts = append(parts, "remove "+strings.Join(removed, ", "))
	}

	return fmt.Sprintf("In project %q: %s", projectName, strings.Join(parts, "; "))
}

func fail(span trace.Span, err error) error {
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())

	return err
}

func actionAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("useraction.id", id.String())
}

func variantAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("useraction.variant.id", id.String())
}
