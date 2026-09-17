package postgres

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
)

type userFavoriteChargerEntity struct {
	ID               uuid.UUID `gorm:"column:id;type:uuid;primaryKey;default:gen_random_uuid()"`
	IdentityID       uuid.UUID `gorm:"column:identity_id;not null"`
	ChargerVariantID uuid.UUID `gorm:"column:charger_variant_id;not null"`
	CreatedAt        time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (userFavoriteChargerEntity) TableName() string {
	return "user_favorite_chargers"
}

type userProjectEntity struct {
	ID          uuid.UUID `gorm:"column:id;type:uuid;primaryKey;default:gen_random_uuid()"`
	IdentityID  uuid.UUID `gorm:"column:identity_id;not null"`
	Name        string    `gorm:"column:name;not null"`
	Description *string   `gorm:"column:description"`
	// Chargers is the ordered embedded membership list - see
	// deployments/migrations/007_add_user_chargers.sql for why it isn't a join table.
	Chargers  json.RawMessage `gorm:"column:chargers;type:jsonb;not null;default:'[]'"`
	CreatedAt time.Time       `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time       `gorm:"column:updated_at;autoUpdateTime"`
}

func (userProjectEntity) TableName() string {
	return "user_projects"
}

func userProjectToEntity(p *userchargers.Project) (*userProjectEntity, error) {
	raw, err := marshalProjectChargers(p.Chargers)
	if err != nil {
		return nil, err
	}

	return &userProjectEntity{
		ID:          p.ID,
		IdentityID:  p.IdentityID,
		Name:        p.Name,
		Description: p.Description,
		Chargers:    raw,
	}, nil
}

func userProjectToDomain(e *userProjectEntity) (*userchargers.Project, error) {
	chargers, err := unmarshalProjectChargers(e.Chargers)
	if err != nil {
		return nil, err
	}

	return &userchargers.Project{
		ID:          e.ID,
		IdentityID:  e.IdentityID,
		Name:        e.Name,
		Description: e.Description,
		Chargers:    chargers,
		CreatedAt:   e.CreatedAt,
		UpdatedAt:   e.UpdatedAt,
	}, nil
}

// marshalProjectChargers always produces a JSON array, never "null" - the column is NOT
// NULL and an empty project must round-trip as [].
func marshalProjectChargers(chargers []userchargers.ProjectCharger) (json.RawMessage, error) {
	if chargers == nil {
		chargers = []userchargers.ProjectCharger{}
	}

	raw, err := json.Marshal(chargers)
	if err != nil {
		return nil, fmt.Errorf("marshal project chargers: %w", err)
	}

	return raw, nil
}

func unmarshalProjectChargers(raw json.RawMessage) ([]userchargers.ProjectCharger, error) {
	if len(raw) == 0 {
		return []userchargers.ProjectCharger{}, nil
	}

	var chargers []userchargers.ProjectCharger
	if err := json.Unmarshal(raw, &chargers); err != nil {
		return nil, fmt.Errorf("unmarshal project chargers: %w", err)
	}

	if chargers == nil {
		chargers = []userchargers.ProjectCharger{}
	}

	return chargers, nil
}
