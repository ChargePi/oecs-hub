package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/onboarding"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OnboardingRepository struct {
	db *gorm.DB
}

func NewOnboardingRepository(db *gorm.DB) *OnboardingRepository {
	return &OnboardingRepository{db: db}
}

func (r *OnboardingRepository) Get(ctx context.Context, identityID uuid.UUID) (*onboarding.Profile, error) {
	var entity userOnboardingEntity

	err := r.db.WithContext(ctx).Where("identity_id = ?", identityID).Take(&entity).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return nil, onboarding.ErrNotFound
	case err != nil:
		return nil, fmt.Errorf("get onboarding profile: %w", err)
	}

	p, err := entity.toDomain()
	if err != nil {
		return nil, fmt.Errorf("get onboarding profile: %w", err)
	}

	return p, nil
}

func (r *OnboardingRepository) Upsert(ctx context.Context, p *onboarding.Profile) (*onboarding.Profile, error) {
	entity, err := userOnboardingToEntity(p)
	if err != nil {
		return nil, fmt.Errorf("upsert onboarding profile: %w", err)
	}

	err = r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "identity_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"status", "answers", "updated_at"}),
	}).Create(entity).Error
	if err != nil {
		return nil, fmt.Errorf("upsert onboarding profile: %w", err)
	}

	stored, err := entity.toDomain()
	if err != nil {
		return nil, fmt.Errorf("upsert onboarding profile: %w", err)
	}

	return stored, nil
}
