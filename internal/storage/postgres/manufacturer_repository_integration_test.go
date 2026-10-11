package postgres_test

import (
	"context"
	"errors"
	"os"
	"reflect"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// TestManufacturerCreateAndReassign_Integration exercises strict manufacturer creation
// and re-linking a charger to another manufacturer against a real Postgres instance.
// Skipped unless OECS_HUB_DATABASE_DSN is set, same convention as
// charger_search_integration_test.go.
func TestManufacturerCreateAndReassign_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	manufacturerRepo := postgresStorage.NewManufacturerRepository(db)
	chargerRepo := postgresStorage.NewChargerRepository(db)
	ctx := context.Background()
	name := "Reassign-" + uuid.NewString()

	target := &manufacturer.Manufacturer{Name: name, Country: "DE"}
	if err := manufacturerRepo.Create(ctx, target); err != nil {
		t.Fatalf("create manufacturer: %v", err)
	}

	if target.ID == uuid.Nil {
		t.Fatal("expected a server-assigned id")
	}

	t.Run("duplicate name and country", func(t *testing.T) {
		err := manufacturerRepo.Create(ctx, &manufacturer.Manufacturer{Name: name, Country: "DE"})
		if !errors.Is(err, manufacturer.ErrAlreadyExists) {
			t.Fatalf("expected ErrAlreadyExists, got %v", err)
		}
	})

	t.Run("duplicate name without country", func(t *testing.T) {
		noCountry := &manufacturer.Manufacturer{Name: name}
		if err := manufacturerRepo.Create(ctx, noCountry); err != nil {
			t.Fatalf("create: %v", err)
		}

		err := manufacturerRepo.Create(ctx, &manufacturer.Manufacturer{Name: name})
		if !errors.Is(err, manufacturer.ErrAlreadyExists) {
			t.Fatalf("expected ErrAlreadyExists, got %v", err)
		}
	})

	t.Run("reassign links charger and rewrites manufacturer fields", func(t *testing.T) {
		c := newTestCharger("Reassign-1", charger.StatusSubmitted)
		if err := chargerRepo.Create(ctx, c); err != nil {
			t.Fatalf("create charger: %v", err)
		}

		patched := *c
		patched.ManufacturerID = &target.ID
		patched.ManufacturerName = target.Name
		patched.ManufacturerCountry = target.Country

		updated, err := chargerRepo.Reassign(ctx, c.ID, &patched)
		if err != nil {
			t.Fatalf("reassign: %v", err)
		}

		if updated.ManufacturerID == nil || *updated.ManufacturerID != target.ID {
			t.Fatalf("expected manufacturer_id %v, got %v", target.ID, updated.ManufacturerID)
		}

		if updated.ManufacturerName != target.Name || updated.ManufacturerCountry != target.Country {
			t.Fatalf("unexpected manufacturer fields: %q %q", updated.ManufacturerName, updated.ManufacturerCountry)
		}

		if updated.Status != charger.StatusSubmitted {
			t.Fatalf("expected status unchanged, got %v", updated.Status)
		}
	})

	t.Run("set owner links, replaces, conflicts and lists", func(t *testing.T) {
		owner := uuid.New()

		linked, err := manufacturerRepo.SetOwner(ctx, target.ID, owner)
		if err != nil {
			t.Fatalf("link: %v", err)
		}

		if linked.OwnerIdentityID == nil || *linked.OwnerIdentityID != owner {
			t.Fatalf("expected owner %v, got %v", owner, linked.OwnerIdentityID)
		}

		replacement := uuid.New()

		replaced, err := manufacturerRepo.SetOwner(ctx, target.ID, replacement)
		if err != nil {
			t.Fatalf("replace: %v", err)
		}

		if replaced.OwnerIdentityID == nil || *replaced.OwnerIdentityID != replacement {
			t.Fatalf("expected owner %v, got %v", replacement, replaced.OwnerIdentityID)
		}

		other := &manufacturer.Manufacturer{Name: name + "-other"}
		if err := manufacturerRepo.Create(ctx, other); err != nil {
			t.Fatalf("create other: %v", err)
		}

		_, err = manufacturerRepo.SetOwner(ctx, other.ID, replacement)
		if !errors.Is(err, manufacturer.ErrOwnershipConflict) {
			t.Fatalf("expected ErrOwnershipConflict, got %v", err)
		}

		query := name
		summaries, _, err := manufacturerRepo.List(ctx, manufacturer.ListFilters{Query: &query}, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		found := false
		for _, s := range summaries {
			if s.Manufacturer.ID == target.ID {
				found = s.Manufacturer.OwnerIdentityID != nil && *s.Manufacturer.OwnerIdentityID == replacement
			}
		}

		if !found {
			t.Fatal("expected List to carry the owner")
		}

		if _, err := manufacturerRepo.SetOwner(ctx, uuid.New(), owner); !errors.Is(err, manufacturer.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("reassign unknown charger", func(t *testing.T) {
		c := newTestCharger("Missing", charger.StatusSubmitted)
		c.ManufacturerID = &target.ID

		_, err := chargerRepo.Reassign(ctx, uuid.New(), c)
		if !errors.Is(err, charger.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})
}

// Skipped unless OECS_HUB_DATABASE_DSN is set.
func TestManufacturerCatalogAndRankedList_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	manufacturerRepo := postgresStorage.NewManufacturerRepository(db)
	chargerRepo := postgresStorage.NewChargerRepository(db)
	ctx := context.Background()
	name := "Catalog-" + uuid.NewString()

	m := &manufacturer.Manufacturer{Name: name, Country: "DE"}
	if err := manufacturerRepo.Create(ctx, m); err != nil {
		t.Fatalf("create manufacturer: %v", err)
	}

	variant := func(model, series, chargerType string, status charger.Status, connectors, protocols []string) *charger.Charger {
		c := newTestCharger(model, status)
		c.ManufacturerID = &m.ID
		c.Series = series
		c.ChargerType = chargerType
		c.ConnectorTypes = connectors
		c.Protocols = protocols

		if err := chargerRepo.Create(ctx, c); err != nil {
			t.Fatalf("create charger: %v", err)
		}

		return c
	}

	wallbox := variant("Bolt 11", "Bolt", "AC", charger.StatusVerified, []string{"Type2_Mennekes"}, []string{"OCPP"})
	wallbox22 := variant("Bolt 22", "Bolt", "AC", charger.StatusVerified, []string{"Type2_Mennekes"}, []string{"OCPP", "ISO15118"})
	fast := variant("Volt 150", "", "DC", charger.StatusVerified, []string{"CCS2_Combo2", "CHAdeMO"}, []string{"OCPP"})
	variant("Draft", "Hidden", "wireless", charger.StatusSubmitted, []string{"NACS"}, []string{"Modbus"})

	t.Run("refresh lists each verified value once", func(t *testing.T) {
		refreshed, err := manufacturerRepo.RefreshCatalog(ctx, m.ID)
		if err != nil {
			t.Fatalf("refresh: %v", err)
		}

		want := manufacturer.Catalog{
			ChargerTypes:   []string{"AC", "DC"},
			ConnectorTypes: []string{"CCS2_Combo2", "CHAdeMO", "Type2_Mennekes"},
			Protocols:      []string{"ISO15118", "OCPP"},
			Series:         []string{"Bolt", "Volt 150"},
		}
		if !reflect.DeepEqual(refreshed.Catalog, want) {
			t.Fatalf("got %+v, want %+v", refreshed.Catalog, want)
		}

		got, err := manufacturerRepo.Get(ctx, m.ID)
		if err != nil {
			t.Fatalf("get: %v", err)
		}

		if !reflect.DeepEqual(got.Catalog, want) {
			t.Fatalf("stored %+v, want %+v", got.Catalog, want)
		}

		query := name
		summaries, _, err := manufacturerRepo.List(ctx, manufacturer.ListFilters{Query: &query}, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		if len(summaries) != 1 || !reflect.DeepEqual(summaries[0].Manufacturer.Catalog, want) {
			t.Fatalf("expected List to carry the catalog, got %+v", summaries)
		}
	})

	t.Run("refresh empties the catalog with no verified variants left", func(t *testing.T) {
		for _, c := range []*charger.Charger{wallbox, wallbox22, fast} {
			if _, err := chargerRepo.UpdateStatus(ctx, c.ID, charger.StatusRejected, nil); err != nil {
				t.Fatalf("reject: %v", err)
			}
		}

		refreshed, err := manufacturerRepo.RefreshCatalog(ctx, m.ID)
		if err != nil {
			t.Fatalf("refresh: %v", err)
		}

		catalog := refreshed.Catalog
		if len(catalog.ChargerTypes)+len(catalog.ConnectorTypes)+len(catalog.Protocols)+len(catalog.Series) != 0 {
			t.Fatalf("expected an empty catalog, got %+v", catalog)
		}
	})

	t.Run("refresh unknown manufacturer", func(t *testing.T) {
		if _, err := manufacturerRepo.RefreshCatalog(ctx, uuid.New()); !errors.Is(err, manufacturer.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("ranked list puts name matches first, then ranked order", func(t *testing.T) {
		first := &manufacturer.Manufacturer{Name: "Ranked-A-" + uuid.NewString()}
		second := &manufacturer.Manufacturer{Name: "Ranked-B-" + uuid.NewString()}

		for _, created := range []*manufacturer.Manufacturer{first, second} {
			if err := manufacturerRepo.Create(ctx, created); err != nil {
				t.Fatalf("create: %v", err)
			}
		}

		query := name
		filters := manufacturer.ListFilters{Query: &query, RankedIDs: []uuid.UUID{second.ID, first.ID}}

		summaries, total, err := manufacturerRepo.List(ctx, filters, 50, 0)
		if err != nil {
			t.Fatalf("list: %v", err)
		}

		got := make([]uuid.UUID, len(summaries))
		for i, s := range summaries {
			got[i] = s.Manufacturer.ID
		}

		want := []uuid.UUID{m.ID, second.ID, first.ID}
		if total != 3 || !reflect.DeepEqual(got, want) {
			t.Fatalf("got %v (total %d), want %v", got, total, want)
		}

		country := "DE"
		filters.Country = &country

		summaries, _, err = manufacturerRepo.List(ctx, filters, 50, 0)
		if err != nil {
			t.Fatalf("list by country: %v", err)
		}

		if len(summaries) != 1 || summaries[0].Manufacturer.ID != m.ID {
			t.Fatalf("expected the country filter to still narrow ranked matches, got %+v", summaries)
		}
	})
}
