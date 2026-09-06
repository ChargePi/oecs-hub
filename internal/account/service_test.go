package account

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type fakeIdentityDeleter struct {
	calledWith uuid.UUID
	err        error
}

func (f *fakeIdentityDeleter) DeleteIdentity(_ context.Context, identityID uuid.UUID) error {
	f.calledWith = identityID
	return f.err
}

func TestService_DeleteAccount(t *testing.T) {
	t.Run("propagates client error", func(t *testing.T) {
		want := errors.New("boom")
		svc := NewService(&fakeIdentityDeleter{err: want})

		if err := svc.DeleteAccount(context.Background(), uuid.New()); !errors.Is(err, want) {
			t.Fatalf("expected wrapped %v, got %v", want, err)
		}
	})

	t.Run("delegates to the client with the given identity", func(t *testing.T) {
		identityID := uuid.New()
		fake := &fakeIdentityDeleter{}
		svc := NewService(fake)

		if err := svc.DeleteAccount(context.Background(), identityID); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if fake.calledWith != identityID {
			t.Fatalf("expected client called with %s, got %s", identityID, fake.calledWith)
		}
	})
}
