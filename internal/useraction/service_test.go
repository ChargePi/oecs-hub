package useraction

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// memStore mirrors the Redis store's contract: owner-scoped keys and a first-decision-wins
// claim.
type memStore struct {
	actions   map[string]*Action
	decisions map[string]Status
}

func newMemStore() *memStore {
	return &memStore{actions: map[string]*Action{}, decisions: map[string]Status{}}
}

func memKey(ownerID, id uuid.UUID) string { return ownerID.String() + ":" + id.String() }

func (m *memStore) Save(_ context.Context, a *Action) error {
	copied := *a
	m.actions[memKey(a.OwnerID, a.ID)] = &copied

	return nil
}

func (m *memStore) Get(_ context.Context, ownerID, id uuid.UUID) (*State, error) {
	a, ok := m.actions[memKey(ownerID, id)]
	if !ok {
		return nil, ErrNotFound
	}

	st := StatusPending
	if d, ok := m.decisions[memKey(ownerID, id)]; ok {
		st = d
	}

	return &State{Action: *a, Status: st}, nil
}

func (m *memStore) Decide(_ context.Context, a *Action, decision Status) (bool, Status, error) {
	key := memKey(a.OwnerID, a.ID)
	if current, ok := m.decisions[key]; ok {
		return false, current, nil
	}

	m.decisions[key] = decision

	return true, decision, nil
}

func (m *memStore) MarkFailed(_ context.Context, a *Action) error {
	m.decisions[memKey(a.OwnerID, a.ID)] = StatusFailed

	return nil
}

func (m *memStore) ListByConversation(_ context.Context, ownerID uuid.UUID, conversationID string) ([]State, error) {
	var out []State

	for _, a := range m.actions {
		if a.OwnerID == ownerID && a.ConversationID == conversationID {
			st, _ := m.Get(context.Background(), ownerID, a.ID)
			out = append(out, *st)
		}
	}

	return out, nil
}

type fakeUserChargers struct {
	favorites   []bool
	created     []string
	managed     [][]userchargers.ChargerChange
	ratings     [][]userchargers.RatingInput
	project     *userchargers.Project
	favoriteErr error
}

func (f *fakeUserChargers) SetFavorite(_ context.Context, _, _ uuid.UUID, favorited bool) (bool, error) {
	if f.favoriteErr != nil {
		return false, f.favoriteErr
	}

	f.favorites = append(f.favorites, favorited)

	return favorited, nil
}

func (f *fakeUserChargers) CreateProject(_ context.Context, identityID uuid.UUID, name string, _ *string) (*userchargers.Project, error) {
	f.created = append(f.created, name)

	return &userchargers.Project{ID: uuid.New(), IdentityID: identityID, Name: name}, nil
}

func (f *fakeUserChargers) GetProject(_ context.Context, identityID, id uuid.UUID) (*userchargers.Project, []userchargers.ProjectChargerEntry, error) {
	if f.project == nil || f.project.ID != id || f.project.IdentityID != identityID {
		return nil, nil, userchargers.ErrNotFound
	}

	return f.project, nil, nil
}

func (f *fakeUserChargers) ManageChargers(_ context.Context, _, _ uuid.UUID, changes []userchargers.ChargerChange, _ []uuid.UUID) (*userchargers.Project, []userchargers.ProjectChargerEntry, error) {
	f.managed = append(f.managed, changes)

	return f.project, nil, nil
}

func (f *fakeUserChargers) SubmitRating(_ context.Context, _, _ uuid.UUID, inputs []userchargers.RatingInput) (userchargers.RatingsSummary, error) {
	f.ratings = append(f.ratings, inputs)

	return userchargers.RatingsSummary{}, nil
}

type fakeChargers struct {
	known map[uuid.UUID]*charger.Charger
}

func (f *fakeChargers) GetMany(_ context.Context, ids []uuid.UUID) ([]*charger.Charger, error) {
	var out []*charger.Charger

	for _, id := range ids {
		if c, ok := f.known[id]; ok {
			out = append(out, c)
		}
	}

	return out, nil
}

type fakePlans struct{ paid bool }

func (f fakePlans) HasPaidPlan(context.Context) (bool, error) { return f.paid, nil }

type fixture struct {
	svc          *Service
	store        *memStore
	userChargers *fakeUserChargers
	ownerID      uuid.UUID
	ctx          context.Context
	wallbox      uuid.UUID
	easee        uuid.UUID
}

func newFixture(t *testing.T, paid bool) *fixture {
	t.Helper()

	wallbox, easee := uuid.New(), uuid.New()
	chargers := &fakeChargers{known: map[uuid.UUID]*charger.Charger{
		wallbox: {ID: wallbox, ManufacturerName: "Wallbox", ModelName: "Pulsar Plus"},
		easee:   {ID: easee, ManufacturerName: "Easee", ModelName: "Charge"},
	}}

	store := newMemStore()
	userChargers := &fakeUserChargers{}
	ownerID := uuid.New()

	return &fixture{
		svc:          NewService(store, userChargers, chargers, fakePlans{paid: paid}, time.Minute),
		store:        store,
		userChargers: userChargers,
		ownerID:      ownerID,
		ctx:          userCtx(ownerID, auth.UserTypeIndividual, "conv-1"),
		wallbox:      wallbox,
		easee:        easee,
	}
}

func userCtx(id uuid.UUID, userType, conversationID string) context.Context {
	ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: id.String(), UserType: userType})

	return WithConversationID(ctx, conversationID)
}

func TestProposeFavorite_StoresPendingActionWithoutExecuting(t *testing.T) {
	f := newFixture(t, false)

	action, err := f.svc.ProposeFavorite(f.ctx, f.wallbox, true)
	if err != nil {
		t.Fatalf("ProposeFavorite: %v", err)
	}

	if action.Summary != "Add Wallbox Pulsar Plus to your favorites" {
		t.Errorf("summary = %q", action.Summary)
	}

	if action.OwnerID != f.ownerID || action.ConversationID != "conv-1" {
		t.Errorf("owner/conversation = %s/%q", action.OwnerID, action.ConversationID)
	}

	if len(f.userChargers.favorites) != 0 {
		t.Fatalf("proposing must not execute, got %v", f.userChargers.favorites)
	}

	state, err := f.svc.Get(f.ctx, action.ID)
	if err != nil || state.Status != StatusPending {
		t.Fatalf("Get = %+v, %v; want pending", state, err)
	}
}

func TestProposeFavorite_UnknownChargerIsRejected(t *testing.T) {
	f := newFixture(t, false)

	_, err := f.svc.ProposeFavorite(f.ctx, uuid.New(), true)
	if !errors.Is(err, userchargers.ErrVariantNotFound) {
		t.Fatalf("err = %v, want ErrVariantNotFound", err)
	}
}

func TestPropose_RequiresEligibleIdentity(t *testing.T) {
	f := newFixture(t, false)

	cases := map[string]struct {
		ctx  context.Context
		code codes.Code
	}{
		"anonymous":    {ctx: context.Background(), code: codes.Unauthenticated},
		"manufacturer": {ctx: userCtx(uuid.New(), auth.UserTypeManufacturer, ""), code: codes.PermissionDenied},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := f.svc.ProposeFavorite(tc.ctx, f.wallbox, true)
			if status.Code(err) != tc.code {
				t.Fatalf("code = %v, want %v (err %v)", status.Code(err), tc.code, err)
			}
		})
	}
}

func TestConfirm_ExecutesOnceAndOnlyForOwner(t *testing.T) {
	f := newFixture(t, false)

	action, err := f.svc.ProposeFavorite(f.ctx, f.wallbox, false)
	if err != nil {
		t.Fatalf("ProposeFavorite: %v", err)
	}

	other := userCtx(uuid.New(), auth.UserTypeIndividual, "conv-1")
	if _, err := f.svc.Confirm(other, action.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other user's Confirm err = %v, want ErrNotFound", err)
	}

	state, err := f.svc.Confirm(f.ctx, action.ID)
	if err != nil {
		t.Fatalf("Confirm: %v", err)
	}

	if state.Status != StatusConfirmed {
		t.Errorf("status = %s, want confirmed", state.Status)
	}

	if len(f.userChargers.favorites) != 1 || f.userChargers.favorites[0] {
		t.Fatalf("favorites writes = %v, want one unfavorite", f.userChargers.favorites)
	}

	if _, err := f.svc.Confirm(f.ctx, action.ID); !errors.Is(err, ErrNotPending) {
		t.Fatalf("second Confirm err = %v, want ErrNotPending", err)
	}

	if _, err := f.svc.Reject(f.ctx, action.ID); !errors.Is(err, ErrNotPending) {
		t.Fatalf("Reject after Confirm err = %v, want ErrNotPending", err)
	}

	if len(f.userChargers.favorites) != 1 {
		t.Fatalf("action ran %d times, want once", len(f.userChargers.favorites))
	}
}

func TestReject_RunsNothingAndBlocksConfirm(t *testing.T) {
	f := newFixture(t, false)

	action, err := f.svc.ProposeRating(f.ctx, f.easee, []userchargers.RatingInput{{CategoryName: "reliability", Score: 5}})
	if err != nil {
		t.Fatalf("ProposeRating: %v", err)
	}

	if action.Summary != "Rate Easee Charge: reliability 5/5" {
		t.Errorf("summary = %q", action.Summary)
	}

	if _, err := f.svc.Reject(f.ctx, action.ID); err != nil {
		t.Fatalf("Reject: %v", err)
	}

	if _, err := f.svc.Confirm(f.ctx, action.ID); !errors.Is(err, ErrNotPending) {
		t.Fatalf("Confirm after Reject err = %v, want ErrNotPending", err)
	}

	if len(f.userChargers.ratings) != 0 {
		t.Fatalf("rejected rating was submitted: %v", f.userChargers.ratings)
	}
}

func TestConfirm_FailedWriteMarksActionFailed(t *testing.T) {
	f := newFixture(t, false)
	f.userChargers.favoriteErr = errors.New("postgres down")

	action, err := f.svc.ProposeFavorite(f.ctx, f.wallbox, true)
	if err != nil {
		t.Fatalf("ProposeFavorite: %v", err)
	}

	if _, err := f.svc.Confirm(f.ctx, action.ID); err == nil {
		t.Fatal("Confirm succeeded despite the write failing")
	}

	state, err := f.svc.Get(f.ctx, action.ID)
	if err != nil || state.Status != StatusFailed {
		t.Fatalf("Get = %+v, %v; want failed", state, err)
	}
}

func TestProposeRating_InvalidCategory(t *testing.T) {
	f := newFixture(t, false)

	_, err := f.svc.ProposeRating(f.ctx, f.easee, []userchargers.RatingInput{{CategoryName: "price", Score: 3}})
	if !errors.Is(err, userchargers.ErrInvalidCategory) {
		t.Fatalf("err = %v, want ErrInvalidCategory", err)
	}
}

func TestProposeProject_NewProjectNeedsPaidPlan(t *testing.T) {
	f := newFixture(t, false)

	_, err := f.svc.ProposeProject(f.ctx, ProjectPayload{NewProject: &NewProject{Name: "Garage"}})
	if !errors.Is(err, userchargers.ErrPaidPlanRequired) {
		t.Fatalf("err = %v, want ErrPaidPlanRequired", err)
	}
}

func TestProposeProject_CreateWithChargersThenConfirm(t *testing.T) {
	f := newFixture(t, true)

	action, err := f.svc.ProposeProject(f.ctx, ProjectPayload{
		NewProject: &NewProject{Name: "  Garage "},
		Changes: []userchargers.ChargerChange{
			{ChargerVariantID: f.wallbox, Action: userchargers.ChargerChangeAdd},
			{ChargerVariantID: f.easee, Action: userchargers.ChargerChangeAdd},
		},
	})
	if err != nil {
		t.Fatalf("ProposeProject: %v", err)
	}

	if want := `Create project "Garage" with Wallbox Pulsar Plus, Easee Charge`; action.Summary != want {
		t.Errorf("summary = %q, want %q", action.Summary, want)
	}

	if _, err := f.svc.Confirm(f.ctx, action.ID); err != nil {
		t.Fatalf("Confirm: %v", err)
	}

	if len(f.userChargers.created) != 1 || f.userChargers.created[0] != "Garage" {
		t.Fatalf("created = %v", f.userChargers.created)
	}

	if len(f.userChargers.managed) != 1 || len(f.userChargers.managed[0]) != 2 {
		t.Fatalf("managed = %v", f.userChargers.managed)
	}
}

func TestProposeProject_ExistingProject(t *testing.T) {
	f := newFixture(t, true)
	f.userChargers.project = &userchargers.Project{
		ID:         uuid.New(),
		IdentityID: f.ownerID,
		Name:       "Office",
		Chargers:   []userchargers.ProjectCharger{{ChargerVariantID: f.easee}},
	}

	t.Run("remove a charger that isn't in the project", func(t *testing.T) {
		_, err := f.svc.ProposeProject(f.ctx, ProjectPayload{
			ProjectID: &f.userChargers.project.ID,
			Changes:   []userchargers.ChargerChange{{ChargerVariantID: f.wallbox, Action: userchargers.ChargerChangeRemove}},
		})
		if !errors.Is(err, ErrInvalidAction) {
			t.Fatalf("err = %v, want ErrInvalidAction", err)
		}
	})

	t.Run("add and remove", func(t *testing.T) {
		action, err := f.svc.ProposeProject(f.ctx, ProjectPayload{
			ProjectID: &f.userChargers.project.ID,
			Changes: []userchargers.ChargerChange{
				{ChargerVariantID: f.wallbox, Action: userchargers.ChargerChangeAdd},
				{ChargerVariantID: f.easee, Action: userchargers.ChargerChangeRemove},
			},
		})
		if err != nil {
			t.Fatalf("ProposeProject: %v", err)
		}

		if want := `In project "Office": add Wallbox Pulsar Plus; remove Easee Charge`; action.Summary != want {
			t.Errorf("summary = %q, want %q", action.Summary, want)
		}
	})

	t.Run("someone else's project", func(t *testing.T) {
		other := userCtx(uuid.New(), auth.UserTypeIndividual, "")

		_, err := f.svc.ProposeProject(other, ProjectPayload{
			ProjectID: &f.userChargers.project.ID,
			Changes:   []userchargers.ChargerChange{{ChargerVariantID: f.wallbox, Action: userchargers.ChargerChangeAdd}},
		})
		if !errors.Is(err, userchargers.ErrNotFound) {
			t.Fatalf("err = %v, want ErrNotFound", err)
		}
	})

	t.Run("project id and new project together", func(t *testing.T) {
		_, err := f.svc.ProposeProject(f.ctx, ProjectPayload{
			ProjectID:  &f.userChargers.project.ID,
			NewProject: &NewProject{Name: "Both"},
		})
		if !errors.Is(err, ErrInvalidAction) {
			t.Fatalf("err = %v, want ErrInvalidAction", err)
		}
	})
}

func TestListByConversation_OnlyCallersActions(t *testing.T) {
	f := newFixture(t, false)

	if _, err := f.svc.ProposeFavorite(f.ctx, f.wallbox, true); err != nil {
		t.Fatalf("ProposeFavorite: %v", err)
	}

	other := userCtx(uuid.New(), auth.UserTypeIndividual, "conv-1")
	if _, err := f.svc.ProposeFavorite(other, f.easee, true); err != nil {
		t.Fatalf("ProposeFavorite (other): %v", err)
	}

	states, err := f.svc.ListByConversation(f.ctx, "conv-1")
	if err != nil {
		t.Fatalf("ListByConversation: %v", err)
	}

	if len(states) != 1 || states[0].Favorite.VariantID != f.wallbox {
		t.Fatalf("states = %+v, want only the caller's wallbox action", states)
	}
}
