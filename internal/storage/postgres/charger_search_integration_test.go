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

// TestSearch_Integration exercises Repository.Search's generic OECS-field filter, and its
// combination with the dedicated power-range/manufacturer filters, against a real Postgres
// instance. It's skipped unless OECS_HUB_DATABASE_DSN is set (see the docker run + goose
// migrate steps used to stand one up for manual verification), since it's not part of the
// normal `go test ./...` run.
func TestSearch_Integration(t *testing.T) {
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

	specA := []byte(`{
		"version": "1.1.0",
		"manufacturer": {"name": "Acme", "country": "US"},
		"model": {"name": "Bolt-9000", "type": "AC"},
		"hardware": {
			"housing": {"material": "aluminum"},
			"connectors": [{"type": "CCS2_Combo2", "currentType": "DC"}]
		},
		"software": {"protocols": [{"name": "OCPP", "version": "2.0.1"}]},
		"pricing": {"pricingModel": "fixed", "prices": [{"value": 1200, "currency": "EUR"}, {"value": 1400, "currency": "USD"}]}
	}`)

	specB := []byte(`{
		"version": "1.1.0",
		"manufacturer": {"name": "Zenith", "country": "DE"},
		"model": {"name": "Volt-1", "type": "DC"},
		"hardware": {
			"housing": {"material": "composite"},
			"connectors": [{"type": "Type2_Mennekes", "currentType": "AC"}]
		},
		"software": {"protocols": [{"name": "OCPP", "version": "1.6"}]},
		"pricing": {"pricingModel": "enquiry"}
	}`)

	a := &charger.Charger{ID: uuid.New(), ManufacturerName: "Acme", ModelName: "Bolt-9000", ChargerType: "AC", ConnectorTypes: []string{"CCS2_Combo2"}, Protocols: []string{}, MinPowerWatts: ptr(7400.0), MaxPowerWatts: ptr(22000.0), SchemaVersion: "1.1.0", Spec: specA, Status: charger.StatusVerified, Ratings: []byte(`{"reliability": {"average": 4.5, "count": 2}, "support": {"average": 2, "count": 1}}`)}
	b := &charger.Charger{ID: uuid.New(), ManufacturerName: "Zenith", ModelName: "Volt-1", ChargerType: "DC", ConnectorTypes: []string{"Type2_Mennekes"}, Protocols: []string{}, MinPowerWatts: ptr(50000.0), MaxPowerWatts: ptr(150000.0), SchemaVersion: "1.1.0", Spec: specB, Status: charger.StatusVerified, Ratings: []byte(`{"reliability": {"average": 3, "count": 4}}`)}

	if err := repo.Create(ctx, a); err != nil {
		t.Fatalf("create a: %v", err)
	}

	if err := repo.Create(ctx, b); err != nil {
		t.Fatalf("create b: %v", err)
	}

	t.Run("scalar field match", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.housing.material", Values: []string{"aluminum"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}
	})

	t.Run("array field match via lax mode", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.connectors.type", Values: []string{"Type2_Mennekes"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != b.ID {
			t.Fatalf("expected only charger b, got total=%d results=%+v", total, results)
		}
	})

	t.Run("multiple values OR-matched", func(t *testing.T) {
		_, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.housing.material", Values: []string{"aluminum", "composite"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 2 {
			t.Fatalf("expected both chargers, got total=%d", total)
		}
	})

	t.Run("no match", func(t *testing.T) {
		_, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.housing.material", Values: []string{"titanium"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 0 {
			t.Fatalf("expected no match, got total=%d", total)
		}
	})

	t.Run("price range matches fixed price in currency", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses: []charger.Status{charger.StatusVerified},
			Price:    &charger.PriceRange{Currency: "EUR", Min: ptr(1000.0), Max: ptr(1500.0)},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}
	})

	t.Run("price range outside bounds or other currency", func(t *testing.T) {
		for _, p := range []charger.PriceRange{
			{Currency: "EUR", Max: ptr(1000.0)},
			{Currency: "EUR", Min: ptr(1300.0)},
			{Currency: "GBP", Min: ptr(0.0)},
		} {
			_, total, err := repo.Search(ctx, charger.SearchFilters{
				Statuses: []charger.Status{charger.StatusVerified},
				Price:    &p,
			}, 50, 0)
			if err != nil {
				t.Fatalf("search: %v", err)
			}

			if total != 0 {
				t.Fatalf("expected no match for %+v, got total=%d", p, total)
			}
		}
	})

	t.Run("protocol version prefix match", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:  []charger.Status{charger.StatusVerified},
			Protocols: []charger.ProtocolFilter{{Name: "OCPP", Version: "2.0.1"}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}
	})

	t.Run("invalid field path is rejected", func(t *testing.T) {
		_, _, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware; DROP TABLE charger_variants;--", Values: []string{"x"}}},
		}, 50, 0)
		if err == nil {
			t.Fatal("expected an error for an invalid field path")
		}
	})

	t.Run("field filter AND-combined with power range", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:      []charger.Status{charger.StatusVerified},
			MinPowerWatts: ptr(1000.0),
			MaxPowerWatts: ptr(30000.0),
			FieldFilters:  []charger.FieldFilter{{Field: "model.type", Values: []string{"AC"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}

		_, total, err = repo.Search(ctx, charger.SearchFilters{
			Statuses:      []charger.Status{charger.StatusVerified},
			MinPowerWatts: ptr(1000.0),
			MaxPowerWatts: ptr(30000.0),
			FieldFilters:  []charger.FieldFilter{{Field: "model.type", Values: []string{"DC"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 0 {
			t.Fatalf("expected no match (b's power is out of range), got total=%d", total)
		}
	})

	t.Run("rating filter matches minimum average", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:      []charger.Status{charger.StatusVerified},
			RatingFilters: []charger.RatingFilter{{Category: "reliability", MinAverage: 4}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}
	})

	t.Run("rating filters AND-matched", func(t *testing.T) {
		_, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses: []charger.Status{charger.StatusVerified},
			RatingFilters: []charger.RatingFilter{
				{Category: "reliability", MinAverage: 4},
				{Category: "support", MinAverage: 3},
			},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 0 {
			t.Fatalf("expected no match (a's support is below 3), got total=%d", total)
		}
	})

	t.Run("unrated category never matches", func(t *testing.T) {
		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Statuses:      []charger.Status{charger.StatusVerified},
			RatingFilters: []charger.RatingFilter{{Category: "support", MinAverage: 1}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a (b has no support ratings), got total=%d results=%+v", total, results)
		}
	})

	t.Run("ranked ids widen the query and set the order", func(t *testing.T) {
		query := "no-name-match-" + uuid.NewString()

		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Query:     &query,
			Statuses:  []charger.Status{charger.StatusVerified},
			RankedIDs: []uuid.UUID{b.ID, a.ID},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 2 || len(results) != 2 || results[0].ID != b.ID || results[1].ID != a.ID {
			t.Fatalf("expected b then a, got total=%d results=%+v", total, results)
		}

		page, _, err := repo.Search(ctx, charger.SearchFilters{
			Query:     &query,
			Statuses:  []charger.Status{charger.StatusVerified},
			RankedIDs: []uuid.UUID{b.ID, a.ID},
		}, 1, 1)
		if err != nil {
			t.Fatalf("search page 2: %v", err)
		}

		if len(page) != 1 || page[0].ID != a.ID {
			t.Fatalf("expected a on the second page, got %+v", page)
		}
	})

	t.Run("ranked ids are still narrowed by other filters", func(t *testing.T) {
		query := "no-name-match-" + uuid.NewString()

		results, total, err := repo.Search(ctx, charger.SearchFilters{
			Query:        &query,
			Statuses:     []charger.Status{charger.StatusVerified},
			RankedIDs:    []uuid.UUID{b.ID, a.ID},
			FieldFilters: []charger.FieldFilter{{Field: "model.type", Values: []string{"AC"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}
	})

	t.Run("name matches rank ahead of ranked ids", func(t *testing.T) {
		query := "Bolt-9000"

		results, _, err := repo.Search(ctx, charger.SearchFilters{
			Query:     &query,
			Statuses:  []charger.Status{charger.StatusVerified},
			RankedIDs: []uuid.UUID{b.ID},
		}, 200, 0)
		if err != nil {
			t.Fatalf("search: %v", err)
		}

		if len(results) < 2 || results[len(results)-1].ID != b.ID {
			t.Fatalf("expected b after every name match, got %+v", results)
		}
	})
}

func ptr[T any](v T) *T { return &v }
