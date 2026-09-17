package userchargers

import (
	"context"
	"errors"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
)

// fakeRepo records what reached the repository and replays a scripted project. Only the
// methods a given test exercises are meaningful; the rest return zero values.
type fakeRepo struct {
	Repository

	project *Project
	applied []ProjectCharger
	created *Project

	ratingInputs []RatingInput
	ratingErr    error
}

func (f *fakeRepo) CreateProject(_ context.Context, p *Project) error {
	f.created = p

	return nil
}

func (f *fakeRepo) ApplyChargerChanges(_ context.Context, _, _ uuid.UUID, apply func([]ProjectCharger) ([]ProjectCharger, error)) (*Project, error) {
	next, err := apply(f.project.Chargers)
	if err != nil {
		return nil, err
	}

	f.applied = next
	f.project.Chargers = next

	return f.project, nil
}

func (f *fakeRepo) UpsertRatings(_ context.Context, _, _ uuid.UUID, inputs []RatingInput) (RatingsSummary, error) {
	f.ratingInputs = inputs

	if f.ratingErr != nil {
		return nil, f.ratingErr
	}

	return RatingsSummary{"reliability": {Average: 4, Count: 1}}, nil
}

// fakeChargers stands in for charger.Service. Like the real GetMany it omits unknown ids
// rather than erroring, which is what makes a short result mean "not in the catalogue".
type fakeChargers struct {
	known map[uuid.UUID]bool
}

func (f *fakeChargers) GetMany(_ context.Context, ids []uuid.UUID) ([]*charger.Charger, error) {
	var out []*charger.Charger

	for _, id := range ids {
		if f.known[id] {
			out = append(out, &charger.Charger{ID: id})
		}
	}

	return out, nil
}

type fakeCache struct{ deleted []uuid.UUID }

func (f *fakeCache) Delete(_ context.Context, id uuid.UUID) error {
	f.deleted = append(f.deleted, id)

	return nil
}

type fakePlans struct {
	paid bool
	err  error
}

func (f *fakePlans) HasPaidPlan(context.Context) (bool, error) {
	return f.paid, f.err
}

func newService(repo Repository, chargers ChargerReader, cache ChargerCache, plans PaidPlanChecker) *Service {
	if repo == nil {
		repo = &fakeRepo{}
	}

	if chargers == nil {
		chargers = &fakeChargers{}
	}

	if cache == nil {
		cache = &fakeCache{}
	}

	if plans == nil {
		plans = &fakePlans{paid: true}
	}

	return NewService(repo, chargers, cache, plans)
}

func TestService_ProjectsRequireAPaidPlan(t *testing.T) {
	ctx := context.Background()

	t.Run("free tier is refused", func(t *testing.T) {
		svc := newService(nil, nil, nil, &fakePlans{paid: false})

		if _, err := svc.CreateProject(ctx, uuid.New(), "Depot", nil); !errors.Is(err, ErrPaidPlanRequired) {
			t.Fatalf("expected ErrPaidPlanRequired, got %v", err)
		}

		if _, _, err := svc.ListProjects(ctx, uuid.New(), 10, 0); !errors.Is(err, ErrPaidPlanRequired) {
			t.Fatalf("expected ErrPaidPlanRequired from ListProjects, got %v", err)
		}

		if err := svc.DeleteProject(ctx, uuid.New(), uuid.New()); !errors.Is(err, ErrPaidPlanRequired) {
			t.Fatalf("expected ErrPaidPlanRequired from DeleteProject, got %v", err)
		}
	})

	// An unreachable billing service must never read as "free" - the handler maps this to
	// Unavailable, not PermissionDenied.
	t.Run("an undeterminable plan is not a refusal", func(t *testing.T) {
		boom := errors.New("billing unreachable")
		svc := newService(nil, nil, nil, &fakePlans{err: boom})

		_, err := svc.CreateProject(ctx, uuid.New(), "Depot", nil)
		if !errors.Is(err, boom) {
			t.Fatalf("expected the checker's error, got %v", err)
		}

		if errors.Is(err, ErrPaidPlanRequired) {
			t.Fatal("an unreachable billing service must not present as a free plan")
		}
	})

	t.Run("ratings and favorites are not gated", func(t *testing.T) {
		repo := &fakeRepo{}
		svc := newService(repo, nil, nil, &fakePlans{paid: false})

		_, err := svc.SubmitRating(ctx, uuid.New(), uuid.New(), []RatingInput{{CategoryName: "reliability", Score: 4}})
		if err != nil {
			t.Fatalf("submitting a rating on a free plan: %v", err)
		}
	})
}

func TestService_CreateProject(t *testing.T) {
	ctx := context.Background()

	t.Run("rejects a blank name", func(t *testing.T) {
		svc := newService(nil, nil, nil, nil)

		if _, err := svc.CreateProject(ctx, uuid.New(), "   ", nil); !errors.Is(err, ErrInvalidProject) {
			t.Fatalf("expected ErrInvalidProject, got %v", err)
		}
	})

	t.Run("trims the name and drops a blank description", func(t *testing.T) {
		repo := &fakeRepo{}
		svc := newService(repo, nil, nil, nil)
		blank := "  "

		project, err := svc.CreateProject(ctx, uuid.New(), "  Depot  ", &blank)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if project.Name != "Depot" {
			t.Fatalf("expected a trimmed name, got %q", project.Name)
		}

		if project.Description != nil {
			t.Fatalf("expected a blank description to be dropped, got %q", *project.Description)
		}

		if repo.created == nil {
			t.Fatal("expected the project to reach the repository")
		}
	})
}

func TestService_ManageChargers(t *testing.T) {
	ctx := context.Background()
	owner := uuid.New()
	projectID := uuid.New()

	known := uuid.New()
	other := uuid.New()
	chargers := &fakeChargers{known: map[uuid.UUID]bool{known: true, other: true}}

	t.Run("rejects a charger that isn't in the catalogue", func(t *testing.T) {
		repo := &fakeRepo{project: &Project{ID: projectID}}
		svc := newService(repo, chargers, nil, nil)

		_, _, err := svc.ManageChargers(ctx, owner, projectID, []ChargerChange{
			{ChargerVariantID: uuid.New(), Action: ChargerChangeAdd},
		}, nil)
		if !errors.Is(err, ErrVariantNotFound) {
			t.Fatalf("expected ErrVariantNotFound, got %v", err)
		}

		if repo.applied != nil {
			t.Fatal("nothing should have been written")
		}
	})

	t.Run("re-adding a charger updates its note instead of duplicating it", func(t *testing.T) {
		note := "second thoughts"
		repo := &fakeRepo{project: &Project{ID: projectID, Chargers: []ProjectCharger{{ChargerVariantID: known}}}}
		svc := newService(repo, chargers, nil, nil)

		_, _, err := svc.ManageChargers(ctx, owner, projectID, []ChargerChange{
			{ChargerVariantID: known, Action: ChargerChangeAdd, Note: &note},
		}, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(repo.applied) != 1 {
			t.Fatalf("expected one member, got %+v", repo.applied)
		}

		if repo.applied[0].Note == nil || *repo.applied[0].Note != note {
			t.Fatalf("expected the note to be updated, got %+v", repo.applied[0])
		}
	})

	t.Run("removing an absent charger is a no-op", func(t *testing.T) {
		repo := &fakeRepo{project: &Project{ID: projectID, Chargers: []ProjectCharger{{ChargerVariantID: known}}}}
		svc := newService(repo, chargers, nil, nil)

		_, _, err := svc.ManageChargers(ctx, owner, projectID, []ChargerChange{
			{ChargerVariantID: other, Action: ChargerChangeRemove},
		}, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(repo.applied) != 1 {
			t.Fatalf("expected the list to be unchanged, got %+v", repo.applied)
		}
	})

	t.Run("applies an ordering after the changes", func(t *testing.T) {
		repo := &fakeRepo{project: &Project{ID: projectID, Chargers: []ProjectCharger{{ChargerVariantID: known}}}}
		svc := newService(repo, chargers, nil, nil)

		_, _, err := svc.ManageChargers(ctx, owner, projectID,
			[]ChargerChange{{ChargerVariantID: other, Action: ChargerChangeAdd}},
			[]uuid.UUID{other, known},
		)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if repo.applied[0].ChargerVariantID != other || repo.applied[1].ChargerVariantID != known {
			t.Fatalf("expected the ordering to be applied, got %+v", repo.applied)
		}
	})

	t.Run("rejects an ordering that isn't a permutation", func(t *testing.T) {
		repo := &fakeRepo{project: &Project{ID: projectID, Chargers: []ProjectCharger{{ChargerVariantID: known}}}}
		svc := newService(repo, chargers, nil, nil)

		_, _, err := svc.ManageChargers(ctx, owner, projectID, nil, []uuid.UUID{other})
		if !errors.Is(err, ErrInvalidOrdering) {
			t.Fatalf("expected ErrInvalidOrdering, got %v", err)
		}
	})
}

func TestService_SubmitRating(t *testing.T) {
	ctx := context.Background()

	t.Run("validation moved across intact", func(t *testing.T) {
		svc := newService(nil, nil, nil, nil)

		_, err := svc.SubmitRating(ctx, uuid.New(), uuid.New(), []RatingInput{{CategoryName: "vibes", Score: 4}})
		if !errors.Is(err, ErrInvalidCategory) {
			t.Fatalf("expected ErrInvalidCategory, got %v", err)
		}

		_, err = svc.SubmitRating(ctx, uuid.New(), uuid.New(), []RatingInput{{CategoryName: "reliability", Score: 9}})
		if !errors.Is(err, ErrInvalidScore) {
			t.Fatalf("expected ErrInvalidScore, got %v", err)
		}

		_, err = svc.SubmitRating(ctx, uuid.New(), uuid.New(), []RatingInput{
			{CategoryName: "reliability", Score: 4},
			{CategoryName: "reliability", Score: 5},
		})
		if !errors.Is(err, ErrInvalidCategory) {
			t.Fatalf("expected a duplicate category to be rejected, got %v", err)
		}
	})

	t.Run("evicts the cached charger so the aggregate isn't stale", func(t *testing.T) {
		variantID := uuid.New()
		cache := &fakeCache{}
		svc := newService(&fakeRepo{}, nil, cache, nil)

		_, err := svc.SubmitRating(ctx, variantID, uuid.New(), []RatingInput{{CategoryName: "reliability", Score: 4}})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(cache.deleted) != 1 || cache.deleted[0] != variantID {
			t.Fatalf("expected the charger to be evicted, got %+v", cache.deleted)
		}
	})
}
