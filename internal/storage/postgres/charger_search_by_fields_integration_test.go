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

// TestSearchByFields_Integration exercises Repository.SearchByFields' generic OECS-field
// filter against a real Postgres instance. It's skipped unless OECS_HUB_DATABASE_DSN is
// set (see the docker run + goose migrate steps used to stand one up for manual
// verification), since it's not part of the normal `go test ./...` run.
func TestSearchByFields_Integration(t *testing.T) {
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
		}
	}`)

	specB := []byte(`{
		"version": "1.1.0",
		"manufacturer": {"name": "Zenith", "country": "DE"},
		"model": {"name": "Volt-1", "type": "DC"},
		"hardware": {
			"housing": {"material": "composite"},
			"connectors": [{"type": "Type2_Mennekes", "currentType": "AC"}]
		}
	}`)

	a := &charger.Charger{ID: uuid.New(), ManufacturerName: "Acme", ModelName: "Bolt-9000", ChargerType: "AC", ConnectorTypes: []string{"CCS2_Combo2"}, Protocols: []string{}, SchemaVersion: "1.1.0", Spec: specA, Status: charger.StatusVerified}
	b := &charger.Charger{ID: uuid.New(), ManufacturerName: "Zenith", ModelName: "Volt-1", ChargerType: "DC", ConnectorTypes: []string{"Type2_Mennekes"}, Protocols: []string{}, SchemaVersion: "1.1.0", Spec: specB, Status: charger.StatusVerified}

	if err := repo.Create(ctx, a); err != nil {
		t.Fatalf("create a: %v", err)
	}

	if err := repo.Create(ctx, b); err != nil {
		t.Fatalf("create b: %v", err)
	}

	t.Run("scalar field match", func(t *testing.T) {
		results, total, err := repo.SearchByFields(ctx, charger.FieldSearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.housing.material", Values: []string{"aluminum"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != a.ID {
			t.Fatalf("expected only charger a, got total=%d results=%+v", total, results)
		}
	})

	t.Run("array field match via lax mode", func(t *testing.T) {
		results, total, err := repo.SearchByFields(ctx, charger.FieldSearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.connectors.type", Values: []string{"Type2_Mennekes"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		if total != 1 || len(results) != 1 || results[0].ID != b.ID {
			t.Fatalf("expected only charger b, got total=%d results=%+v", total, results)
		}
	})

	t.Run("multiple values OR-matched", func(t *testing.T) {
		_, total, err := repo.SearchByFields(ctx, charger.FieldSearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.housing.material", Values: []string{"aluminum", "composite"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		if total != 2 {
			t.Fatalf("expected both chargers, got total=%d", total)
		}
	})

	t.Run("no match", func(t *testing.T) {
		_, total, err := repo.SearchByFields(ctx, charger.FieldSearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware.housing.material", Values: []string{"titanium"}}},
		}, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		if total != 0 {
			t.Fatalf("expected no match, got total=%d", total)
		}
	})

	t.Run("invalid field path is rejected", func(t *testing.T) {
		_, _, err := repo.SearchByFields(ctx, charger.FieldSearchFilters{
			Statuses:     []charger.Status{charger.StatusVerified},
			FieldFilters: []charger.FieldFilter{{Field: "hardware; DROP TABLE charger_variants;--", Values: []string{"x"}}},
		}, 50, 0)
		if err == nil {
			t.Fatal("expected an error for an invalid field path")
		}
	})
}
