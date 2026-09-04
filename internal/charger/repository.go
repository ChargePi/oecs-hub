package charger

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var (
	ErrNotFound    = errors.New("charger not found")
	ErrInvalidSpec = errors.New("charger spec failed validation")
)

const (
	DefaultPageSize = 50
	MaxPageSize     = 200
)

// FieldFilter matches chargers whose OECS spec has Field (a dot-separated path into the
// spec document, e.g. "hardware.housing.material" or "hardware.connectors.type") equal to
// any one of Values. Array-valued fields along the path are matched element-wise, so a
// path through a repeated node (e.g. "hardware.connectors.type") matches if any element
// has one of the given values.
type FieldFilter struct {
	Field  string
	Values []string
}

// SearchFilters holds the optional filters accepted by Repository.List. A nil/empty
// field matches "any" for that filter. ConnectorTypes/Protocols are OR-matched.
type SearchFilters struct {
	Query          *string
	ManufacturerID *uuid.UUID
	ChargerType    *string
	ConnectorTypes []string
	MinPowerWatts  *float64
	MaxPowerWatts  *float64
	Country        *string
	Protocols      []string
	Statuses       []Status
}

// FieldSearchFilters holds the filters accepted by Repository.SearchByFields: an optional
// free-text query, charger type and manufacturer, plus any number of generic OECS field
// filters. FieldFilters are AND-matched against each other and against Query/ChargerType/
// ManufacturerID; within one FieldFilter, Values are OR-matched. Used by the MCP
// search_chargers tool, which - unlike the public gRPC search - needs to filter on
// arbitrary OECS spec fields rather than a fixed set of denormalized columns.
type FieldSearchFilters struct {
	Query          *string
	ManufacturerID *uuid.UUID
	ChargerType    *string
	Statuses       []Status
	FieldFilters   []FieldFilter
}

type Repository interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	GetForReview(ctx context.Context, id uuid.UUID) (*Charger, error)
	Create(ctx context.Context, c *Charger) error
	List(ctx context.Context, filters SearchFilters, limit, offset uint32) ([]*Charger, int64, error)
	// SearchByFields returns chargers matching filters, paginated - see FieldSearchFilters.
	SearchByFields(ctx context.Context, filters FieldSearchFilters, limit, offset uint32) ([]*Charger, int64, error)
	// ListByIDs silently omits missing/unverified IDs rather than erroring.
	ListByIDs(ctx context.Context, ids []uuid.UUID) ([]*Charger, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status Status, manufacturerID *uuid.UUID) (*Charger, error)
	// UpsertRatings records raterIdentityID's score for each input category against
	// variantID, overwriting any prior score of theirs in the same category, then returns
	// the recomputed aggregate across all raters. Returns ErrNotFound if variantID doesn't
	// exist or isn't verified.
	UpsertRatings(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []RatingInput) (RatingsSummary, error)
}

type Cache interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	Set(ctx context.Context, c *Charger) error
	Delete(ctx context.Context, id uuid.UUID) error
}
