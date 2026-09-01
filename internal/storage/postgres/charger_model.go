package postgres

import (
	"encoding/json"
	"time"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type chargerVariantEntity struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	ManufacturerID      *uuid.UUID `gorm:"column:manufacturer_id;index"`
	ManufacturerName    string     `gorm:"column:manufacturer_name;not null"`
	ManufacturerCountry *string    `gorm:"column:manufacturer_country"`

	Series          *string        `gorm:"column:series;index:idx_charger_variants_manufacturer_series,priority:2"`
	ModelName       string         `gorm:"column:model_name;not null"`
	PartNumber      *string        `gorm:"column:part_number"`
	ChargerType     string         `gorm:"column:charger_type;not null;index"`
	ModelStatus     *string        `gorm:"column:model_status"`
	ConnectorTypes  pq.StringArray `gorm:"column:connector_types;type:text[]"`
	Protocols       pq.StringArray `gorm:"column:protocols;type:text[]"`
	MinPowerWatts   *float64       `gorm:"column:min_power_watts"`
	MaxPowerWatts   *float64       `gorm:"column:max_power_watts"`
	ProductImageURL *string        `gorm:"column:product_image_url"`

	SchemaVersion string          `gorm:"column:schema_version;not null"`
	Spec          json.RawMessage `gorm:"column:spec;type:jsonb;not null"`
	Ratings       json.RawMessage `gorm:"column:ratings;type:jsonb;not null"`

	Status                string     `gorm:"column:status;not null;default:submitted;index"`
	SubmittedByIdentityID *uuid.UUID `gorm:"column:submitted_by_identity_id"`
	SubmittedBy           *string    `gorm:"column:submitted_by"`
	SubmittedByEmail      *string    `gorm:"column:submitted_by_email"`
	SubmittedAt           time.Time  `gorm:"column:submitted_at;autoCreateTime"`
	ReviewedAt            *time.Time `gorm:"column:reviewed_at"`

	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (chargerVariantEntity) TableName() string {
	return "charger_variants"
}

// ratingsOrEmpty defaults an unset Ratings field to "{}" - the column is NOT NULL and a
// nil json.RawMessage would otherwise round-trip as SQL NULL.
func ratingsOrEmpty(ratings []byte) json.RawMessage {
	if len(ratings) == 0 {
		return json.RawMessage("{}")
	}

	return json.RawMessage(ratings)
}

func chargerToEntity(c *charger.Charger) *chargerVariantEntity {
	return &chargerVariantEntity{
		ID:                    c.ID,
		ManufacturerID:        c.ManufacturerID,
		ManufacturerName:      c.ManufacturerName,
		ManufacturerCountry:   strPtrOrNil(c.ManufacturerCountry),
		Series:                strPtrOrNil(c.Series),
		ModelName:             c.ModelName,
		PartNumber:            strPtrOrNil(c.PartNumber),
		ChargerType:           c.ChargerType,
		ModelStatus:           strPtrOrNil(c.ModelStatus),
		ConnectorTypes:        pq.StringArray(c.ConnectorTypes),
		Protocols:             pq.StringArray(c.Protocols),
		MinPowerWatts:         c.MinPowerWatts,
		MaxPowerWatts:         c.MaxPowerWatts,
		ProductImageURL:       strPtrOrNil(c.ProductImageURL),
		SchemaVersion:         c.SchemaVersion,
		Spec:                  json.RawMessage(c.Spec),
		Ratings:               ratingsOrEmpty(c.Ratings),
		Status:                string(c.Status),
		SubmittedByIdentityID: uuidPtrOrNil(c.SubmittedByIdentityID),
		SubmittedBy:           strPtrOrNil(c.SubmittedBy),
		SubmittedByEmail:      strPtrOrNil(c.SubmittedByEmail),
		SubmittedAt:           c.SubmittedAt,
		ReviewedAt:            c.ReviewedAt,
		CreatedAt:             c.CreatedAt,
		UpdatedAt:             c.UpdatedAt,
	}
}

func chargerToDomain(e *chargerVariantEntity) *charger.Charger {
	return &charger.Charger{
		ID:                    e.ID,
		ManufacturerID:        e.ManufacturerID,
		ManufacturerName:      e.ManufacturerName,
		ManufacturerCountry:   strOrEmpty(e.ManufacturerCountry),
		Series:                strOrEmpty(e.Series),
		ModelName:             e.ModelName,
		PartNumber:            strOrEmpty(e.PartNumber),
		ChargerType:           e.ChargerType,
		ModelStatus:           strOrEmpty(e.ModelStatus),
		ConnectorTypes:        []string(e.ConnectorTypes),
		Protocols:             []string(e.Protocols),
		MinPowerWatts:         e.MinPowerWatts,
		MaxPowerWatts:         e.MaxPowerWatts,
		ProductImageURL:       strOrEmpty(e.ProductImageURL),
		SchemaVersion:         e.SchemaVersion,
		Spec:                  []byte(e.Spec),
		Ratings:               []byte(e.Ratings),
		Status:                charger.Status(e.Status),
		SubmittedByIdentityID: uuidOrNil(e.SubmittedByIdentityID),
		SubmittedBy:           strOrEmpty(e.SubmittedBy),
		SubmittedByEmail:      strOrEmpty(e.SubmittedByEmail),
		SubmittedAt:           e.SubmittedAt,
		ReviewedAt:            e.ReviewedAt,
		CreatedAt:             e.CreatedAt,
		UpdatedAt:             e.UpdatedAt,
	}
}

func chargersToDomainSlice(entities []*chargerVariantEntity) []*charger.Charger {
	chargers := make([]*charger.Charger, len(entities))
	for i, e := range entities {
		chargers[i] = chargerToDomain(e)
	}

	return chargers
}
