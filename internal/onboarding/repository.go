package onboarding

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("onboarding profile not found")

type Repository interface {
	Get(ctx context.Context, identityID uuid.UUID) (*Profile, error)
	Upsert(ctx context.Context, p *Profile) (*Profile, error)
}
