package postgres_test

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/preferences"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestPreferencesRepository_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	ctx := context.Background()
	repo := postgresStorage.NewPreferencesRepository(db)
	id := uuid.New()

	t.Cleanup(func() {
		db.Exec(`DELETE FROM user_preferences WHERE identity_id = ?`, id)
	})

	_, err = repo.Get(ctx, id)
	if !errors.Is(err, preferences.ErrNotFound) {
		t.Fatalf("Get before upsert: got %v, want ErrNotFound", err)
	}

	p := preferences.Defaults(id)

	_, err = repo.Upsert(ctx, p)
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}

	p.Currency = "GBP"
	p.UnitSystem = preferences.UnitSystemImperial
	p.ViewMode = preferences.ViewModeSimplified
	p.ChatLayout = preferences.ChatLayoutDrawer

	_, err = repo.Upsert(ctx, p)
	if err != nil {
		t.Fatalf("second upsert: %v", err)
	}

	got, err := repo.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if *got != *p {
		t.Fatalf("got %+v, want %+v", got, p)
	}

	err = db.Exec(`UPDATE user_preferences SET preferences = '{"currency":"USD"}' WHERE identity_id = ?`, id).Error
	if err != nil {
		t.Fatalf("overwrite preferences: %v", err)
	}

	got, err = repo.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get partial: %v", err)
	}

	want := preferences.Defaults(id)
	want.Currency = "USD"

	if *got != *want {
		t.Fatalf("partial: got %+v, want %+v", got, want)
	}
}
