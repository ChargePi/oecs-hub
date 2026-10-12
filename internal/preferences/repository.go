package preferences

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("preferences not found")

type Repository interface {
	Get(ctx context.Context, identityID uuid.UUID) (*Preferences, error)
	Upsert(ctx context.Context, p *Preferences) (*Preferences, error)
}
