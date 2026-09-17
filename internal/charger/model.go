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
	// StatusCancelled is a manufacturer-initiated withdrawal of their own submission,
	// distinct from an admin StatusRejected decision. Only reachable from
	// StatusSubmitted - see Service.CancelSubmission.
	StatusCancelled Status = "cancelled"
	// StatusArchived is an admin-initiated removal of a previously reviewed charger from
	// the public registry, distinct from StatusRejected (never approved) or
	// StatusCancelled (manufacturer-withdrawn). Only reachable via AdminService.
	StatusArchived Status = "archived"
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
	// userchargers.RatingsSummary - keyed by rating_categories.name (e.g. "reliability"),
	// each value a score/count pair. Empty ("{}") until individual ratings are submitted.
	// This package only reads it; the write path lives in internal/userchargers.
	Ratings []byte

	CreatedAt time.Time
	UpdatedAt time.Time
}
