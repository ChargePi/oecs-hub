package manufacturer

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("manufacturer not found")

// ErrAlreadyExists is returned by Create when (name, country) is already taken.
var ErrAlreadyExists = errors.New("manufacturer already exists")

// ErrOwnershipConflict is returned by FindOrCreateForIdentity when the (name, country)
// requested is already owned by a different identity - the caller can't silently attach
// to or overwrite someone else's manufacturer row.
var ErrOwnershipConflict = errors.New("manufacturer already owned by a different account")

var ErrSemanticSearchDisabled = errors.New("semantic search is disabled")

const (
	// DefaultPageSize is applied when a caller requests a paginated listing with limit 0.
	DefaultPageSize = 50
	// MaxPageSize caps the number of rows returned in a single paginated call.
	MaxPageSize = 200
)

type ListFilters struct {
	Query   *string
	Country *string
	// RankedIDs are semantic matches, best first, set by Service.List; they rank after name matches.
	RankedIDs []uuid.UUID
}

type Repository interface {
	// Get retrieves a manufacturer by ID.
	Get(ctx context.Context, id uuid.UUID) (*Manufacturer, error)
	// Create inserts m as an unowned, admin-authored manufacturer. Returns
	// ErrAlreadyExists if (name, country) is taken. On return, m.ID (and other
	// server-assigned fields) are populated.
	Create(ctx context.Context, m *Manufacturer) error
	// FindOrCreateForIdentity resolves (name, country) to a manufacturer row owned by
	// ownerIdentityID: reuses a row this identity already owns, claims an unowned row
	// matching (name, country), creates a new owned row, or returns ErrOwnershipConflict
	// if (name, country) is already owned by a different identity. On return, m.ID (and
	// other server-assigned fields) are populated.
	FindOrCreateForIdentity(ctx context.Context, ownerIdentityID uuid.UUID, m *Manufacturer) error
	// SetOwner links id to ownerIdentityID, replacing any current owner. Returns
	// ErrNotFound if id doesn't exist, or ErrOwnershipConflict if ownerIdentityID already
	// owns a different manufacturer.
	SetOwner(ctx context.Context, id, ownerIdentityID uuid.UUID) (*Manufacturer, error)
	// RefreshCatalog returns ErrNotFound if id doesn't exist.
	RefreshCatalog(ctx context.Context, id uuid.UUID) (*Manufacturer, error)
	// List returns manufacturers matching filters, paginated, together with
	// product/variant counts derived from verified charger_variants. Returns the page
	// of results plus the total count of matching manufacturers, ignoring limit/offset.
	List(ctx context.Context, filters ListFilters, limit, offset uint32) ([]*Summary, int64, error)
}

// SemanticIndex is implemented by internal/vector.ManufacturerIndex.
type SemanticIndex interface {
	Upsert(ctx context.Context, m *Manufacturer) error
	// Search returns the best match first.
	Search(ctx context.Context, query string) ([]uuid.UUID, error)
}

type Cache interface {
	Get(ctx context.Context, id uuid.UUID) (*Manufacturer, error)
	Set(ctx context.Context, m *Manufacturer) error
	Delete(ctx context.Context, id uuid.UUID) error
}
