package postgres_test

import (
	"context"
	"os"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// TestUpsertRatings_Integration exercises Repository.UpsertRatings' upsert + aggregate
// recompute against a real Postgres instance. Skipped unless OECS_HUB_DATABASE_DSN is set,
// same convention as charger_search_by_fields_integration_test.go.
func TestUpsertRatings_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	repo := postgresStorage.NewChargerRepository(db)
	ctx := context.Background()

	spec := []byte(`{
		"version": "1.1.0",
		"manufacturer": {"name": "Acme", "country": "US"},
		"model": {"name": "Bolt-9000", "type": "AC"},
		"hardware": {"housing": {}, "connectors": []}
	}`)

	verified := &charger.Charger{ID: uuid.New(), ManufacturerName: "Acme", ModelName: "Bolt-9000", ChargerType: "AC", ConnectorTypes: []string{}, Protocols: []string{}, SchemaVersion: "1.1.0", Spec: spec, Status: charger.StatusVerified}
	if err := repo.Create(ctx, verified); err != nil {
		t.Fatalf("create verified charger: %v", err)
	}

	unverified := &charger.Charger{ID: uuid.New(), ManufacturerName: "Acme", ModelName: "Zap-1", ChargerType: "AC", ConnectorTypes: []string{}, Protocols: []string{}, SchemaVersion: "1.1.0", Spec: spec, Status: charger.StatusSubmitted}
	if err := repo.Create(ctx, unverified); err != nil {
		t.Fatalf("create unverified charger: %v", err)
	}

	raterA := uuid.New()
	raterB := uuid.New()

	t.Run("upsert then aggregate over multiple raters", func(t *testing.T) {
		summary, err := repo.UpsertRatings(ctx, verified.ID, raterA, []charger.RatingInput{
			{CategoryName: "reliability", Score: 4},
			{CategoryName: "design", Score: 5},
		})
		if err != nil {
			t.Fatalf("upsert rater A: %v", err)
		}

		if got := summary["reliability"]; got.Average != 4 || got.Count != 1 {
			t.Fatalf("reliability after rater A: %+v", got)
		}

		summary, err = repo.UpsertRatings(ctx, verified.ID, raterB, []charger.RatingInput{
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
		summary, err := repo.UpsertRatings(ctx, verified.ID, raterA, []charger.RatingInput{
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

	t.Run("unverified variant is not found", func(t *testing.T) {
		_, err := repo.UpsertRatings(ctx, unverified.ID, raterA, []charger.RatingInput{
			{CategoryName: "reliability", Score: 3},
		})
		if err != charger.ErrNotFound {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("nonexistent variant is not found", func(t *testing.T) {
		_, err := repo.UpsertRatings(ctx, uuid.New(), raterA, []charger.RatingInput{
			{CategoryName: "reliability", Score: 3},
		})
		if err != charger.ErrNotFound {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})
}
