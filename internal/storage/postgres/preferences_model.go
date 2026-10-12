package postgres

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
)

type userPreferencesEntity struct {
	IdentityID  uuid.UUID       `gorm:"column:identity_id;type:uuid;primaryKey"`
	Preferences json.RawMessage `gorm:"column:preferences;type:jsonb;not null;default:'{}'"`
	CreatedAt   time.Time       `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time       `gorm:"column:updated_at;autoUpdateTime"`
}

func (userPreferencesEntity) TableName() string {
	return "user_preferences"
}

type storedPreferences struct {
	Currency   string `json:"currency,omitempty"`
	UnitSystem string `json:"unitSystem,omitempty"`
	ViewMode   string `json:"viewMode,omitempty"`
	ChatLayout string `json:"chatLayout,omitempty"`
	Language   string `json:"language,omitempty"`
}

func userPreferencesToEntity(p *preferences.Preferences) (*userPreferencesEntity, error) {
	raw, err := json.Marshal(storedPreferences{
		Currency:   p.Currency,
		UnitSystem: string(p.UnitSystem),
		ViewMode:   string(p.ViewMode),
		ChatLayout: string(p.ChatLayout),
		Language:   p.Language,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal preferences: %w", err)
	}

	return &userPreferencesEntity{IdentityID: p.IdentityID, Preferences: raw}, nil
}

func (e *userPreferencesEntity) toDomain() (*preferences.Preferences, error) {
	var stored storedPreferences

	err := json.Unmarshal(e.Preferences, &stored)
	if err != nil {
		return nil, fmt.Errorf("unmarshal preferences: %w", err)
	}

	p := preferences.Defaults(e.IdentityID)
	p.ChatLayout = preferences.ChatLayout(stored.ChatLayout)

	if stored.Currency != "" {
		p.Currency = stored.Currency
	}

	if stored.UnitSystem != "" {
		p.UnitSystem = preferences.UnitSystem(stored.UnitSystem)
	}

	if stored.ViewMode != "" {
		p.ViewMode = preferences.ViewMode(stored.ViewMode)
	}

	if stored.Language != "" {
		p.Language = stored.Language
	}

	return p, nil
}
