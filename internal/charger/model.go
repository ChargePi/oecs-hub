package charger

import (
	"time"

	"github.com/google/uuid"
)

type Status string

const (
	StatusSubmitted Status = "submitted"
	StatusVerified  Status = "verified"
	StatusRejected  Status = "rejected"
)

type Charger struct {
	ID uuid.UUID

	// ManufacturerID is nil until the submission is verified.
	ManufacturerID      *uuid.UUID
	ManufacturerName    string
	ManufacturerCountry string

	Series          string
	ModelName       string
	PartNumber      string
	ChargerType     string
	ModelStatus     string
	ConnectorTypes  []string
	Protocols       []string
	MinPowerWatts   *float64
	MaxPowerWatts   *float64
	ProductImageURL string

	SchemaVersion string
	Spec          []byte

	Status      Status
	SubmittedBy string
	SubmittedAt time.Time
	ReviewedAt  *time.Time

	CreatedAt time.Time
	UpdatedAt time.Time
}
