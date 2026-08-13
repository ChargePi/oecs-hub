package manufacturer

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("manufacturer not found")

const (
	// DefaultPageSize is applied when a caller requests a paginated listing with limit 0.
	DefaultPageSize = 50
	// MaxPageSize caps the number of rows returned in a single paginated call.
	MaxPageSize = 200
)

type Repository interface {
	// Get retrieves a manufacturer by ID.
	Get(ctx context.Context, id uuid.UUID) (*Manufacturer, error)
	// FindOrCreate finds a manufacturer by (name, country) or creates one from m if none
	// exists. On return, m.ID (and other server-assigned fields) are populated.
	FindOrCreate(ctx context.Context, m *Manufacturer) error
	// List returns manufacturers matching query/country, paginated, together with
	// product/variant counts derived from verified charger_variants. Returns the page
	// of results plus the total count of matching manufacturers, ignoring limit/offset.
	List(ctx context.Context, query, country *string, limit, offset uint32) ([]*Summary, int64, error)
}

type Cache interface {
	Get(ctx context.Context, id uuid.UUID) (*Manufacturer, error)
	Set(ctx context.Context, m *Manufacturer) error
	Delete(ctx context.Context, id uuid.UUID) error
}
