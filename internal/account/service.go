// Package account handles user-account lifecycle operations, independent of any
// specific auth provider.
package account

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("account.service")

// IdentityDeleter deletes a user's identity from the auth provider.
type IdentityDeleter interface {
	DeleteIdentity(ctx context.Context, identityID uuid.UUID) error
}

type Service struct {
	identities IdentityDeleter
}

func NewService(identities IdentityDeleter) *Service {
	return &Service{identities: identities}
}

func (s *Service) DeleteAccount(ctx context.Context, identityID uuid.UUID) error {
	ctx, span := tracer.Start(ctx, "account.DeleteAccount", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	if err := s.identities.DeleteIdentity(ctx, identityID); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("delete identity: %w", err)
	}

	return nil
}
