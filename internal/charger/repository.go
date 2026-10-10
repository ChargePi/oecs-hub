package charger

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var (
	ErrNotFound    = errors.New("charger not found")
	ErrInvalidSpec = errors.New("charger spec failed validation")
	// ErrSemanticSearchDisabled is returned by Service.Reindex when no SemanticIndex is
	// configured.
	ErrSemanticSearchDisabled = errors.New("semantic search is disabled")
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

// RatingFilter excludes chargers unrated in Category.
type RatingFilter struct {
	Category   string
	MinAverage float64
}

// SearchFilters holds the filters accepted by Repository.Search. A nil/empty Query or
// ManufacturerID matches "any" for that filter. FieldFilters are AND-matched against each
// other and against Query/ManufacturerID/the power range; within one FieldFilter, Values
// are OR-matched. Every OECS-schema-derived facet (charger type, connector type, country,
// protocol, and so on) is expressed as a FieldFilter rather than a dedicated struct field -
// see internal/grpc/handler.go's allow-list for which paths the public API accepts (the
// MCP search_chargers tool, an internal caller, is not restricted by that allow-list).
type SearchFilters struct {
	Query          *string
	ManufacturerID *uuid.UUID
	MinPowerWatts  *float64
	MaxPowerWatts  *float64
	Statuses       []Status
	FieldFilters   []FieldFilter
	Price          *PriceRange
	Protocols      []ProtocolFilter
	RatingFilters  []RatingFilter
	// SubmitterIdentityID, if set, matches only chargers submitted by this Kratos
	// identity - used by the manufacturer self-service API to scope results to the
	// caller's own submissions, regardless of status.
	SubmitterIdentityID *uuid.UUID
	// RankedIDs, best match first, widens Query to also match these IDs and orders them
	// after name matches. Set by Service.Search from the SemanticIndex, never by callers.
	RankedIDs []uuid.UUID
}

// PriceRange matches chargers with a fixed MSRP in Currency between Min and Max (each
// bound optional).
type PriceRange struct {
	Currency string
	Min      *float64
	Max      *float64
}

// ProtocolFilter matches a software.protocols entry by name and, if Version is set, by
// version prefix.
type ProtocolFilter struct {
	Name    string
	Version string
}

type Repository interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	GetForReview(ctx context.Context, id uuid.UUID) (*Charger, error)
	Create(ctx context.Context, c *Charger) error
	// Search returns chargers matching filters, paginated.
	Search(ctx context.Context, filters SearchFilters, limit, offset uint32) ([]*Charger, int64, error)
	// ListByIDs silently omits missing/unverified IDs rather than erroring.
	ListByIDs(ctx context.Context, ids []uuid.UUID) ([]*Charger, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status Status, manufacturerID *uuid.UUID) (*Charger, error)
	// UpdateSpec overwrites id's spec and extracted fields with c's, but only while id is
	// still owned by submitterIdentityID and has Status == StatusSubmitted. Returns
	// ErrNotFound otherwise (ambiguous between not-found/not-yours/already-reviewed,
	// matching UpdateStatus's terseness) - used by the manufacturer self-service
	// EditSpecification RPC.
	UpdateSpec(ctx context.Context, id, submitterIdentityID uuid.UUID, c *Charger) (*Charger, error)
	// AdminUpdateSpec overwrites id's spec and extracted fields with c's regardless of
	// owner or status. Returns ErrNotFound if id doesn't exist. Used by the admin
	// UpdateSchemaSpec RPC.
	AdminUpdateSpec(ctx context.Context, id uuid.UUID, c *Charger) (*Charger, error)
	// Reassign overwrites id's spec, extracted fields and manufacturer link with c's
	// regardless of owner or status. Returns ErrNotFound if id doesn't exist. Used by
	// the admin ReassignSchemaManufacturer RPC.
	Reassign(ctx context.Context, id uuid.UUID, c *Charger) (*Charger, error)
	// CancelSubmission sets id's Status to StatusCancelled, but only while id is still
	// owned by submitterIdentityID and has Status == StatusSubmitted. Returns ErrNotFound
	// otherwise, same ambiguity as UpdateSpec. Used by the manufacturer self-service
	// CancelSubmission RPC.
	CancelSubmission(ctx context.Context, id, submitterIdentityID uuid.UUID) (*Charger, error)
}

// SemanticIndex is the vector index over verified chargers. Implemented by
// internal/vector.ChargerIndex.
type SemanticIndex interface {
	Upsert(ctx context.Context, c *Charger) error
	Remove(ctx context.Context, id uuid.UUID) error
	// Search returns the IDs of the chargers closest to query, best match first.
	Search(ctx context.Context, query string) ([]uuid.UUID, error)
}

type Cache interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	Set(ctx context.Context, c *Charger) error
	Delete(ctx context.Context, id uuid.UUID) error
}
