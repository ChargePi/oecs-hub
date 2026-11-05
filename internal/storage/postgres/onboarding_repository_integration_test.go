package postgres_test

import (
	"context"
	"errors"
	"os"
	"reflect"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/onboarding"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestOnboardingRepository_Integration(t *testing.T) {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		t.Skip("OECS_HUB_DATABASE_DSN not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	ctx := context.Background()
	repo := postgresStorage.NewOnboardingRepository(db)
	id := uuid.New()

	t.Cleanup(func() {
		db.Exec(`DELETE FROM user_onboarding WHERE identity_id = ?`, id)
	})

	_, err = repo.Get(ctx, id)
	if !errors.Is(err, onboarding.ErrNotFound) {
		t.Fatalf("Get before upsert: got %v, want ErrNotFound", err)
	}

	p := onboarding.Pending(id)
	p.Status = onboarding.StatusSkipped

	_, err = repo.Upsert(ctx, p)
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}

	p.Status = onboarding.StatusCompleted
	p.Answers = []onboarding.Answer{
		{QuestionID: "experience", OptionIDs: []string{"beginner"}},
		{QuestionID: "goals", OptionIDs: []string{"fleet", "other"}},
	}

	_, err = repo.Upsert(ctx, p)
	if err != nil {
		t.Fatalf("second upsert: %v", err)
	}

	got, err := repo.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if !reflect.DeepEqual(got, p) {
		t.Fatalf("got %+v, want %+v", got, p)
	}
}
