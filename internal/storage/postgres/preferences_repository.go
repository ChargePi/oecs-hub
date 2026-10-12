package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PreferencesRepository struct {
	db *gorm.DB
}

func NewPreferencesRepository(db *gorm.DB) *PreferencesRepository {
	return &PreferencesRepository{db: db}
}

func (r *PreferencesRepository) Get(ctx context.Context, identityID uuid.UUID) (*preferences.Preferences, error) {
	var entity userPreferencesEntity

	err := r.db.WithContext(ctx).Where("identity_id = ?", identityID).Take(&entity).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return nil, preferences.ErrNotFound
	case err != nil:
		return nil, fmt.Errorf("get preferences: %w", err)
	}

	p, err := entity.toDomain()
	if err != nil {
		return nil, fmt.Errorf("get preferences: %w", err)
	}

	return p, nil
}

func (r *PreferencesRepository) Upsert(ctx context.Context, p *preferences.Preferences) (*preferences.Preferences, error) {
	entity, err := userPreferencesToEntity(p)
	if err != nil {
		return nil, fmt.Errorf("upsert preferences: %w", err)
	}

	err = r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "identity_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"preferences", "updated_at"}),
	}).Create(entity).Error
	if err != nil {
		return nil, fmt.Errorf("upsert preferences: %w", err)
	}

	stored, err := entity.toDomain()
	if err != nil {
		return nil, fmt.Errorf("upsert preferences: %w", err)
	}

	return stored, nil
}
