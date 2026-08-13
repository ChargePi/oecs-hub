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

type Repository interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	GetForReview(ctx context.Context, id uuid.UUID) (*Charger, error)
	Create(ctx context.Context, c *Charger) error
	List(ctx context.Context, filters SearchFilters, limit, offset uint32) ([]*Charger, int64, error)
	// ListByIDs silently omits missing/unverified IDs rather than erroring.
	ListByIDs(ctx context.Context, ids []uuid.UUID) ([]*Charger, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status Status, manufacturerID *uuid.UUID) (*Charger, error)
}

type Cache interface {
	Get(ctx context.Context, id uuid.UUID) (*Charger, error)
	Set(ctx context.Context, c *Charger) error
	Delete(ctx context.Context, id uuid.UUID) error
}
