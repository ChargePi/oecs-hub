package postgres_test

import (
	"context"
	"errors"
	"os"
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
		summaries, _, err := manufacturerRepo.List(ctx, &query, nil, 50, 0)
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
