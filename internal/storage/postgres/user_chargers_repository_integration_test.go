package postgres_test

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

const testSpec = `{
	"version": "1.1.0",
	"manufacturer": {"name": "Acme", "country": "US"},
	"model": {"name": "Bolt-9000", "type": "AC"},
	"hardware": {"housing": {}, "connectors": []}
}`

// newTestCharger builds a minimally-populated charger row - the rating and membership
// paths only care about its id and status.
func newTestCharger(modelName string, status charger.Status) *charger.Charger {
	return &charger.Charger{
		ID:               uuid.New(),
		ManufacturerName: "Acme",
		ModelName:        modelName,
		ChargerType:      "AC",
		ConnectorTypes:   []string{},
		Protocols:        []string{},
		SchemaVersion:    "1.1.0",
		Spec:             []byte(testSpec),
		Status:           status,
	}
}

// TestUpsertRatings_Integration exercises UserChargersRepository.UpsertRatings' upsert +
// aggregate recompute against a real Postgres instance. Skipped unless
// OECS_HUB_DATABASE_DSN is set, same convention as charger_search_integration_test.go.
func TestUpsertRatings_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	chargerRepo := postgresStorage.NewChargerRepository(db)
	repo := postgresStorage.NewUserChargersRepository(db)
	ctx := context.Background()

	verified := newTestCharger("Bolt-9000", charger.StatusVerified)
	if err := chargerRepo.Create(ctx, verified); err != nil {
		t.Fatalf("create verified charger: %v", err)
	}

	unverified := newTestCharger("Zap-1", charger.StatusSubmitted)
	if err := chargerRepo.Create(ctx, unverified); err != nil {
		t.Fatalf("create unverified charger: %v", err)
	}

	raterA := uuid.New()
	raterB := uuid.New()

	t.Run("upsert then aggregate over multiple raters", func(t *testing.T) {
		summary, err := repo.UpsertRatings(ctx, verified.ID, raterA, []userchargers.RatingInput{
			{CategoryName: "reliability", Score: 4},
			{CategoryName: "design", Score: 5},
		})
		if err != nil {
			t.Fatalf("upsert rater A: %v", err)
		}

		if got := summary["reliability"]; got.Average != 4 || got.Count != 1 {
			t.Fatalf("reliability after rater A: %+v", got)
		}

		summary, err = repo.UpsertRatings(ctx, verified.ID, raterB, []userchargers.RatingInput{
			{CategoryName: "reliability", Score: 2},
		})
		if err != nil {
			t.Fatalf("upsert rater B: %v", err)
		}

		if got := summary["reliability"]; got.Average != 3 || got.Count != 2 {
			t.Fatalf("reliability after rater B: expected avg=3 count=2, got %+v", got)
		}

		if got := summary["design"]; got.Average != 5 || got.Count != 1 {
			t.Fatalf("design should be unaffected by rater B's submission: %+v", got)
		}
	})

	t.Run("re-rating overwrites rather than duplicating", func(t *testing.T) {
		summary, err := repo.UpsertRatings(ctx, verified.ID, raterA, []userchargers.RatingInput{
			{CategoryName: "reliability", Score: 1},
		})
		if err != nil {
			t.Fatalf("re-rate: %v", err)
		}

		// raterA (was 4) now 1, raterB stays 2: average 1.5, count still 2.
		if got := summary["reliability"]; got.Average != 1.5 || got.Count != 2 {
			t.Fatalf("expected overwrite (avg=1.5, count=2), got %+v", got)
		}
	})

	t.Run("rater's own ratings are grouped per charger", func(t *testing.T) {
		ratings, total, err := repo.ListRatingsByRater(ctx, raterA, 10, 0)
		if err != nil {
			t.Fatalf("list ratings by rater: %v", err)
		}

		if total != 1 || len(ratings) != 1 {
			t.Fatalf("expected one rated charger, got total=%d len=%d", total, len(ratings))
		}

		if ratings[0].ChargerVariantID != verified.ID {
			t.Fatalf("unexpected charger: %s", ratings[0].ChargerVariantID)
		}

		// raterA rated reliability and design, so both categories come back on one entry.
		if len(ratings[0].Scores) != 2 {
			t.Fatalf("expected 2 category scores, got %+v", ratings[0].Scores)
		}
	})

	t.Run("unverified variant is not found", func(t *testing.T) {
		_, err := repo.UpsertRatings(ctx, unverified.ID, raterA, []userchargers.RatingInput{
			{CategoryName: "reliability", Score: 3},
		})
		if !errors.Is(err, userchargers.ErrVariantNotFound) {
			t.Fatalf("expected ErrVariantNotFound, got %v", err)
		}
	})

	t.Run("nonexistent variant is not found", func(t *testing.T) {
		_, err := repo.UpsertRatings(ctx, uuid.New(), raterA, []userchargers.RatingInput{
			{CategoryName: "reliability", Score: 3},
		})
		if !errors.Is(err, userchargers.ErrVariantNotFound) {
			t.Fatalf("expected ErrVariantNotFound, got %v", err)
		}
	})
}

func TestFavorites_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	chargerRepo := postgresStorage.NewChargerRepository(db)
	repo := postgresStorage.NewUserChargersRepository(db)
	ctx := context.Background()

	verified := newTestCharger("Fav-1", charger.StatusVerified)
	if err := chargerRepo.Create(ctx, verified); err != nil {
		t.Fatalf("create verified charger: %v", err)
	}

	unverified := newTestCharger("Fav-2", charger.StatusSubmitted)
	if err := chargerRepo.Create(ctx, unverified); err != nil {
		t.Fatalf("create unverified charger: %v", err)
	}

	identityID := uuid.New()

	t.Run("favoriting twice is idempotent", func(t *testing.T) {
		for range 2 {
			favorited, err := repo.SetFavorite(ctx, identityID, verified.ID, true)
			if err != nil {
				t.Fatalf("set favorite: %v", err)
			}

			if !favorited {
				t.Fatal("expected favorited=true")
			}
		}

		favorites, total, err := repo.ListFavorites(ctx, identityID, 10, 0)
		if err != nil {
			t.Fatalf("list favorites: %v", err)
		}

		if total != 1 || len(favorites) != 1 {
			t.Fatalf("expected exactly one favorite, got total=%d len=%d", total, len(favorites))
		}
	})

	t.Run("unfavoriting twice is idempotent", func(t *testing.T) {
		for range 2 {
			favorited, err := repo.SetFavorite(ctx, identityID, verified.ID, false)
			if err != nil {
				t.Fatalf("unset favorite: %v", err)
			}

			if favorited {
				t.Fatal("expected favorited=false")
			}
		}

		_, total, err := repo.ListFavorites(ctx, identityID, 10, 0)
		if err != nil {
			t.Fatalf("list favorites: %v", err)
		}

		if total != 0 {
			t.Fatalf("expected no favorites, got %d", total)
		}
	})

	t.Run("unverified charger cannot be favorited", func(t *testing.T) {
		_, err := repo.SetFavorite(ctx, identityID, unverified.ID, true)
		if !errors.Is(err, userchargers.ErrVariantNotFound) {
			t.Fatalf("expected ErrVariantNotFound, got %v", err)
		}
	})
}

func TestProjects_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	chargerRepo := postgresStorage.NewChargerRepository(db)
	repo := postgresStorage.NewUserChargersRepository(db)
	ctx := context.Background()

	first := newTestCharger("Proj-1", charger.StatusVerified)
	if err := chargerRepo.Create(ctx, first); err != nil {
		t.Fatalf("create charger: %v", err)
	}

	second := newTestCharger("Proj-2", charger.StatusVerified)
	if err := chargerRepo.Create(ctx, second); err != nil {
		t.Fatalf("create charger: %v", err)
	}

	owner := uuid.New()
	stranger := uuid.New()

	project := &userchargers.Project{ID: uuid.New(), IdentityID: owner, Name: "Depot"}
	if err := repo.CreateProject(ctx, project); err != nil {
		t.Fatalf("create project: %v", err)
	}

	t.Run("a new project round-trips with an empty charger list", func(t *testing.T) {
		loaded, err := repo.GetProject(ctx, owner, project.ID)
		if err != nil {
			t.Fatalf("get project: %v", err)
		}

		if loaded.Chargers == nil || len(loaded.Chargers) != 0 {
			t.Fatalf("expected an empty, non-nil charger list, got %+v", loaded.Chargers)
		}
	})

	t.Run("another identity cannot read the project", func(t *testing.T) {
		_, err := repo.GetProject(ctx, stranger, project.ID)
		if !errors.Is(err, userchargers.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("membership edits round-trip through the JSONB column", func(t *testing.T) {
		note := "primary candidate"

		updated, err := repo.ApplyChargerChanges(ctx, owner, project.ID, func(current []userchargers.ProjectCharger) ([]userchargers.ProjectCharger, error) {
			return append(current,
				userchargers.ProjectCharger{ChargerVariantID: first.ID, Note: &note},
				userchargers.ProjectCharger{ChargerVariantID: second.ID},
			), nil
		})
		if err != nil {
			t.Fatalf("apply charger changes: %v", err)
		}

		if len(updated.Chargers) != 2 {
			t.Fatalf("expected 2 chargers, got %+v", updated.Chargers)
		}

		if updated.Chargers[0].ChargerVariantID != first.ID || updated.Chargers[0].Note == nil || *updated.Chargers[0].Note != note {
			t.Fatalf("first member did not round-trip: %+v", updated.Chargers[0])
		}

		if updated.Chargers[1].Note != nil {
			t.Fatalf("second member should have no note: %+v", updated.Chargers[1])
		}
	})

	t.Run("another identity cannot edit membership", func(t *testing.T) {
		_, err := repo.ApplyChargerChanges(ctx, stranger, project.ID, func(current []userchargers.ProjectCharger) ([]userchargers.ProjectCharger, error) {
			return nil, nil
		})
		if !errors.Is(err, userchargers.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("a blank description clears the column", func(t *testing.T) {
		description := "a depot"

		updated, err := repo.UpdateProjectAttributes(ctx, owner, project.ID, userchargers.ProjectAttributes{Description: &description})
		if err != nil {
			t.Fatalf("set description: %v", err)
		}

		if updated.Description == nil || *updated.Description != description {
			t.Fatalf("expected description to be set, got %+v", updated.Description)
		}

		blank := ""

		updated, err = repo.UpdateProjectAttributes(ctx, owner, project.ID, userchargers.ProjectAttributes{Description: &blank})
		if err != nil {
			t.Fatalf("clear description: %v", err)
		}

		if updated.Description != nil {
			t.Fatalf("expected description to be cleared, got %q", *updated.Description)
		}
	})

	t.Run("another identity cannot delete the project", func(t *testing.T) {
		if err := repo.DeleteProject(ctx, stranger, project.ID); !errors.Is(err, userchargers.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}

		if err := repo.DeleteProject(ctx, owner, project.ID); err != nil {
			t.Fatalf("delete project: %v", err)
		}
	})
}
