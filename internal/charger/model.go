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

	Status Status
	// SubmittedByIdentityID is the Kratos identity ID of the manufacturer account that
	// submitted this spec, forwarded by the Traefik/Oathkeeper edge - see internal/auth.
	SubmittedByIdentityID uuid.UUID
	SubmittedBy           string
	// SubmittedByEmail is the submitting account's login email at submission time (also
	// forwarded by the edge), kept so an admin reviewing a submission can contact the
	// manufacturer directly instead of cross-referencing Kratos's admin API by identity ID.
	SubmittedByEmail string
	SubmittedAt      time.Time
	ReviewedAt       *time.Time

	// Ratings is the denormalized per-category rating aggregate, stored as JSON matching
	// RatingsSummary - keyed by rating_categories.name (e.g. "reliability"), each value a
	// CategoryScore. Empty ("{}") until individual ratings are submitted.
	Ratings []byte

	CreatedAt time.Time
	UpdatedAt time.Time
}

// CategoryScore is one category's aggregated rating, as stored in Charger.Ratings.
type CategoryScore struct {
	Average float64 `json:"average"`
	Count   int64   `json:"count"`
}

// RatingsSummary is the decoded shape of Charger.Ratings - one CategoryScore per
// rating_categories.name.
type RatingsSummary map[string]CategoryScore
