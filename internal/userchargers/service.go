package userchargers

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("userchargers.service")

// ErrPaidPlanRequired is returned by every project method when the caller is on a free
// plan. Distinct from a failure to determine the plan at all, which surfaces as a wrapped
// error from PaidPlanChecker - handlers map the two to different gRPC codes so the UI can
// tell "upgrade" from "billing is down".
var ErrPaidPlanRequired = errors.New("projects require a paid plan")

// ChargerReader hydrates catalogue detail for the ids a user-scoped collection holds.
// Implemented by *charger.Service; it silently omits ids that aren't verified chargers,
// which is also how this package validates ids before writing them.
type ChargerReader interface {
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error)
}

// ChargerCache evicts a charger from the read-side cache. Implemented by
// redis.ChargerCache. Needed because UpsertRatings rewrites the denormalized
// charger_variants.ratings column that the cached copy carries.
type ChargerCache interface {
	Delete(ctx context.Context, id uuid.UUID) error
}

// PaidPlanChecker reports whether the caller (taken from ctx, not passed explicitly)
// holds a paid plan. Implemented by *entitlement.Service. An error means the plan could
// not be determined, never "free".
type PaidPlanChecker interface {
	HasPaidPlan(ctx context.Context) (bool, error)
}

// FavoriteEntry is a favorite with its charger hydrated.
type FavoriteEntry struct {
	Charger     *charger.Charger
	FavoritedAt time.Time
}

// ProjectChargerEntry is a project member with its charger hydrated.
type ProjectChargerEntry struct {
	Charger *charger.Charger
	Note    *string
}

// MyRatingEntry is a rated charger with the caller's own scores.
type MyRatingEntry struct {
	Charger *charger.Charger
	Scores  []RatingInput
	RatedAt time.Time
}

type Service struct {
	repo         Repository
	chargers     ChargerReader
	chargerCache ChargerCache
	plans        PaidPlanChecker
}

func NewService(repo Repository, chargers ChargerReader, chargerCache ChargerCache, plans PaidPlanChecker) *Service {
	return &Service{repo: repo, chargers: chargers, chargerCache: chargerCache, plans: plans}
}

// SetFavorite adds or removes one charger from identityID's favorites. Idempotent in both
// directions.
func (s *Service) SetFavorite(ctx context.Context, identityID, variantID uuid.UUID, favorited bool) (bool, error) {
	ctx, span := tracer.Start(ctx, "userchargers.SetFavorite",
		trace.WithAttributes(identityAttr(identityID), variantAttr(variantID)))
	defer span.End()

	result, err := s.repo.SetFavorite(ctx, identityID, variantID, favorited)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return false, fmt.Errorf("set favorite: %w", err)
	}

	return result, nil
}

// ListFavorites returns identityID's favorites newest-first, with catalogue detail.
func (s *Service) ListFavorites(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]FavoriteEntry, int64, error) {
	ctx, span := tracer.Start(ctx, "userchargers.ListFavorites", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	favorites, total, err := s.repo.ListFavorites(ctx, identityID, clampPageSize(limit), offset)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, fmt.Errorf("list favorites: %w", err)
	}

	ids := make([]uuid.UUID, 0, len(favorites))
	for _, fav := range favorites {
		ids = append(ids, fav.ChargerVariantID)
	}

	byID, err := s.hydrate(ctx, ids)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, err
	}

	entries := make([]FavoriteEntry, 0, len(favorites))

	for _, fav := range favorites {
		c, ok := byID[fav.ChargerVariantID]
		if !ok {
			continue
		}

		entries = append(entries, FavoriteEntry{Charger: c, FavoritedAt: fav.CreatedAt})
	}

	return entries, total, nil
}

// CreateProject creates an empty project owned by identityID.
func (s *Service) CreateProject(ctx context.Context, identityID uuid.UUID, name string, description *string) (*Project, error) {
	ctx, span := tracer.Start(ctx, "userchargers.CreateProject", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	if err := s.requirePaidPlan(ctx, span); err != nil {
		return nil, err
	}

	name, err := validateProjectName(name)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, err
	}

	project := &Project{
		ID:          uuid.New(),
		IdentityID:  identityID,
		Name:        name,
		Description: blankToNil(description),
		Chargers:    []ProjectCharger{},
	}

	if err := s.repo.CreateProject(ctx, project); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("create project: %w", err)
	}

	return project, nil
}

// UpdateProject changes project attributes only. Membership goes through ManageChargers.
func (s *Service) UpdateProject(ctx context.Context, identityID, id uuid.UUID, attrs ProjectAttributes) (*Project, error) {
	ctx, span := tracer.Start(ctx, "userchargers.UpdateProject",
		trace.WithAttributes(identityAttr(identityID), projectAttr(id)))
	defer span.End()

	if err := s.requirePaidPlan(ctx, span); err != nil {
		return nil, err
	}

	if attrs.Name != nil {
		name, err := validateProjectName(*attrs.Name)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())

			return nil, err
		}

		attrs.Name = &name
	}

	// A nil Description means "leave it alone", so it must stay nil; a non-nil one sets
	// the column, and the repository stores a blank value as NULL. That is how a caller
	// clears a description, which is why this trims in place instead of collapsing blank
	// to nil the way CreateProject does.
	attrs.Description = trimmed(attrs.Description)

	project, err := s.repo.UpdateProjectAttributes(ctx, identityID, id, attrs)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("update project: %w", err)
	}

	return project, nil
}

// DeleteProject removes one of identityID's own projects.
func (s *Service) DeleteProject(ctx context.Context, identityID, id uuid.UUID) error {
	ctx, span := tracer.Start(ctx, "userchargers.DeleteProject",
		trace.WithAttributes(identityAttr(identityID), projectAttr(id)))
	defer span.End()

	if err := s.requirePaidPlan(ctx, span); err != nil {
		return err
	}

	if err := s.repo.DeleteProject(ctx, identityID, id); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("delete project: %w", err)
	}

	return nil
}

// ListProjects returns identityID's projects newest-first. Charger lists are left
// unhydrated - only GetProject pays for catalogue detail.
func (s *Service) ListProjects(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]*Project, int64, error) {
	ctx, span := tracer.Start(ctx, "userchargers.ListProjects", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	if err := s.requirePaidPlan(ctx, span); err != nil {
		return nil, 0, err
	}

	projects, total, err := s.repo.ListProjects(ctx, identityID, clampPageSize(limit), offset)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, fmt.Errorf("list projects: %w", err)
	}

	return projects, total, nil
}

// GetProject returns one of identityID's projects with its chargers hydrated, in the
// project's own order.
func (s *Service) GetProject(ctx context.Context, identityID, id uuid.UUID) (*Project, []ProjectChargerEntry, error) {
	ctx, span := tracer.Start(ctx, "userchargers.GetProject",
		trace.WithAttributes(identityAttr(identityID), projectAttr(id)))
	defer span.End()

	if err := s.requirePaidPlan(ctx, span); err != nil {
		return nil, nil, err
	}

	project, err := s.repo.GetProject(ctx, identityID, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, nil, fmt.Errorf("get project: %w", err)
	}

	entries, err := s.hydrateProjectChargers(ctx, project.Chargers)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, nil, err
	}

	return project, entries, nil
}

// ManageChargers applies a batch of membership changes to one of identityID's projects and
// optionally reorders the result, atomically. ordering, when non-empty, must be a
// permutation of the project's charger ids once changes have been applied.
func (s *Service) ManageChargers(ctx context.Context, identityID, id uuid.UUID, changes []ChargerChange, ordering []uuid.UUID) (*Project, []ProjectChargerEntry, error) {
	ctx, span := tracer.Start(ctx, "userchargers.ManageChargers",
		trace.WithAttributes(identityAttr(identityID), projectAttr(id)))
	defer span.End()

	if err := s.requirePaidPlan(ctx, span); err != nil {
		return nil, nil, err
	}

	// Validate every referenced charger against the catalogue up front: the embedded JSON
	// column has no FK, so nothing else would catch an id that isn't a verified charger.
	if err := s.requireVariantsExist(ctx, addedVariantIDs(changes)); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, nil, err
	}

	project, err := s.repo.ApplyChargerChanges(ctx, identityID, id, func(current []ProjectCharger) ([]ProjectCharger, error) {
		next, err := applyChanges(current, changes)
		if err != nil {
			return nil, err
		}

		return reorder(next, ordering)
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, nil, fmt.Errorf("apply project charger changes: %w", err)
	}

	entries, err := s.hydrateProjectChargers(ctx, project.Chargers)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, nil, err
	}

	return project, entries, nil
}

// SubmitRating validates inputs and upserts raterIdentityID's per-category scores for
// variantID, then evicts the cached charger so the next read reflects the recomputed
// aggregate rather than the stale cached one.
func (s *Service) SubmitRating(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []RatingInput) (RatingsSummary, error) {
	ctx, span := tracer.Start(ctx, "userchargers.SubmitRating",
		trace.WithAttributes(identityAttr(raterIdentityID), variantAttr(variantID)))
	defer span.End()

	if err := validateRatingInputs(inputs); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, err
	}

	summary, err := s.repo.UpsertRatings(ctx, variantID, raterIdentityID, inputs)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("upsert ratings: %w", err)
	}

	_ = s.chargerCache.Delete(ctx, variantID)

	return summary, nil
}

// ListMyRatings returns the chargers raterIdentityID has rated, newest-first, with their
// own scores and the catalogue detail (which carries the aggregate).
func (s *Service) ListMyRatings(ctx context.Context, raterIdentityID uuid.UUID, limit, offset uint32) ([]MyRatingEntry, int64, error) {
	ctx, span := tracer.Start(ctx, "userchargers.ListMyRatings", trace.WithAttributes(identityAttr(raterIdentityID)))
	defer span.End()

	ratings, total, err := s.repo.ListRatingsByRater(ctx, raterIdentityID, clampPageSize(limit), offset)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, fmt.Errorf("list ratings by rater: %w", err)
	}

	ids := make([]uuid.UUID, 0, len(ratings))
	for _, rating := range ratings {
		ids = append(ids, rating.ChargerVariantID)
	}

	byID, err := s.hydrate(ctx, ids)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, err
	}

	entries := make([]MyRatingEntry, 0, len(ratings))

	for _, rating := range ratings {
		c, ok := byID[rating.ChargerVariantID]
		if !ok {
			continue
		}

		entries = append(entries, MyRatingEntry{Charger: c, Scores: rating.Scores, RatedAt: rating.RatedAt})
	}

	return entries, total, nil
}

// requirePaidPlan gates the project feature. A free plan is ErrPaidPlanRequired; an
// undeterminable plan is the checker's own error, wrapped.
func (s *Service) requirePaidPlan(ctx context.Context, span trace.Span) error {
	paid, err := s.plans.HasPaidPlan(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("check plan: %w", err)
	}

	if !paid {
		span.SetStatus(codes.Error, ErrPaidPlanRequired.Error())

		return ErrPaidPlanRequired
	}

	return nil
}

// requireVariantsExist rejects ids that aren't verified chargers. GetMany omits them
// rather than erroring, so a short result is the signal.
func (s *Service) requireVariantsExist(ctx context.Context, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}

	found, err := s.hydrate(ctx, ids)
	if err != nil {
		return err
	}

	for _, id := range ids {
		if _, ok := found[id]; !ok {
			return fmt.Errorf("%w: %s", ErrVariantNotFound, id)
		}
	}

	return nil
}

func (s *Service) hydrate(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]*charger.Charger, error) {
	if len(ids) == 0 {
		return map[uuid.UUID]*charger.Charger{}, nil
	}

	chargers, err := s.chargers.GetMany(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("get chargers: %w", err)
	}

	byID := make(map[uuid.UUID]*charger.Charger, len(chargers))
	for _, c := range chargers {
		byID[c.ID] = c
	}

	return byID, nil
}

func (s *Service) hydrateProjectChargers(ctx context.Context, members []ProjectCharger) ([]ProjectChargerEntry, error) {
	ids := make([]uuid.UUID, 0, len(members))
	for _, member := range members {
		ids = append(ids, member.ChargerVariantID)
	}

	byID, err := s.hydrate(ctx, ids)
	if err != nil {
		return nil, err
	}

	entries := make([]ProjectChargerEntry, 0, len(members))

	for _, member := range members {
		c, ok := byID[member.ChargerVariantID]
		if !ok {
			continue
		}

		entries = append(entries, ProjectChargerEntry{Charger: c, Note: member.Note})
	}

	return entries, nil
}

// applyChanges folds a batch onto the project's current list. Adds append (so order is
// insertion order), re-adding an existing charger only updates its note, and removing or
// annotating an absent one is a no-op rather than an error - the batch is a desired-state
// edit, not a transaction log.
func applyChanges(current []ProjectCharger, changes []ChargerChange) ([]ProjectCharger, error) {
	next := make([]ProjectCharger, len(current))
	copy(next, current)

	indexOf := func(id uuid.UUID) int {
		for i, member := range next {
			if member.ChargerVariantID == id {
				return i
			}
		}

		return -1
	}

	for _, change := range changes {
		at := indexOf(change.ChargerVariantID)

		switch change.Action {
		case ChargerChangeAdd:
			if at >= 0 {
				next[at].Note = change.Note

				continue
			}

			next = append(next, ProjectCharger{ChargerVariantID: change.ChargerVariantID, Note: change.Note})
		case ChargerChangeRemove:
			if at >= 0 {
				next = append(next[:at], next[at+1:]...)
			}
		case ChargerChangeSetNote:
			if at >= 0 {
				next[at].Note = change.Note
			}
		default:
			return nil, fmt.Errorf("%w: unknown charger change action %q", ErrInvalidProject, change.Action)
		}
	}

	if len(next) > MaxProjectChargers {
		return nil, fmt.Errorf("%w: a project holds at most %d chargers", ErrInvalidProject, MaxProjectChargers)
	}

	return next, nil
}

// reorder rearranges members to match ordering, which must be a permutation of their ids.
// An empty ordering leaves the list alone.
func reorder(members []ProjectCharger, ordering []uuid.UUID) ([]ProjectCharger, error) {
	if len(ordering) == 0 {
		return members, nil
	}

	if len(ordering) != len(members) {
		return nil, ErrInvalidOrdering
	}

	byID := make(map[uuid.UUID]ProjectCharger, len(members))
	for _, member := range members {
		byID[member.ChargerVariantID] = member
	}

	next := make([]ProjectCharger, 0, len(ordering))

	for _, id := range ordering {
		member, ok := byID[id]
		if !ok {
			return nil, ErrInvalidOrdering
		}

		delete(byID, id)

		next = append(next, member)
	}

	return next, nil
}

// addedVariantIDs collects the ids a batch introduces, which are the only ones that need
// to exist in the catalogue - removing or annotating an id already stored doesn't.
func addedVariantIDs(changes []ChargerChange) []uuid.UUID {
	var ids []uuid.UUID

	seen := make(map[uuid.UUID]bool, len(changes))

	for _, change := range changes {
		if change.Action != ChargerChangeAdd || seen[change.ChargerVariantID] {
			continue
		}

		seen[change.ChargerVariantID] = true

		ids = append(ids, change.ChargerVariantID)
	}

	return ids
}

func validateProjectName(name string) (string, error) {
	name = strings.TrimSpace(name)

	if name == "" {
		return "", fmt.Errorf("%w: name is required", ErrInvalidProject)
	}

	if len(name) > MaxProjectName {
		return "", fmt.Errorf("%w: name is longer than %d characters", ErrInvalidProject, MaxProjectName)
	}

	return name, nil
}

// blankToNil trims the value and collapses a blank one to nil - on create, "sent an empty
// description" and "sent none" are the same thing.
func blankToNil(value *string) *string {
	value = trimmed(value)
	if value == nil || *value == "" {
		return nil
	}

	return value
}

// trimmed trims the pointed-at value while preserving whether the pointer was set at all.
func trimmed(value *string) *string {
	if value == nil {
		return nil
	}

	result := strings.TrimSpace(*value)

	return &result
}

func clampPageSize(limit uint32) uint32 {
	if limit == 0 {
		return DefaultPageSize
	}

	if limit > MaxPageSize {
		return MaxPageSize
	}

	return limit
}
