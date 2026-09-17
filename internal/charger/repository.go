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
	// SubmitterIdentityID, if set, matches only chargers submitted by this Kratos
	// identity - used by the manufacturer self-service API to scope results to the
	// caller's own submissions, regardless of status.
	SubmitterIdentityID *uuid.UUID
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
	// CancelSubmission sets id's Status to StatusCancelled, but only while id is still
	// owned by submitterIdentityID and has Status == StatusSubmitted. Returns ErrNotFound
	// otherwise, same ambiguity as UpdateSpec. Used by the manufacturer self-service
	// CancelSubmission RPC.
	CancelSubmission(ctx context.Context, id, submitterIdentityID uuid.UUID) (*Charger, error)
}

type Cache interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	Set(ctx context.Context, c *Charger) error
	Delete(ctx context.Context, id uuid.UUID) error
}
