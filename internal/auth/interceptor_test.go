package auth

import (
	"context"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func callWithMetadata(t *testing.T, secret string, md metadata.MD) *Identity {
	t.Helper()

	ctx := metadata.NewIncomingContext(context.Background(), md)

	var captured *Identity

	handler := func(ctx context.Context, req any) (any, error) {
		captured, _ = FromContext(ctx)
		return nil, nil
	}

	_, err := UnaryInterceptor(secret)(ctx, nil, &grpc.UnaryServerInfo{}, handler)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	return captured
}

func TestUnaryInterceptor_NoMetadata(t *testing.T) {
	identity := callWithMetadata(t, "secret", metadata.MD{})
	if identity != nil {
		t.Fatalf("expected no identity, got %+v", identity)
	}
}

func TestUnaryInterceptor_WrongSecret(t *testing.T) {
	md := metadata.Pairs(
		gatewaySecretHeader, "wrong",
		userIDHeader, "user-1",
	)

	identity := callWithMetadata(t, "secret", md)
	if identity != nil {
		t.Fatalf("expected no identity with wrong secret, got %+v", identity)
	}
}

func TestUnaryInterceptor_ValidSecretAndIdentity(t *testing.T) {
	md := metadata.Pairs(
		gatewaySecretHeader, "secret",
		userIDHeader, "user-1",
		userEmailHeader, "user@example.com",
		userTypeHeader, "manufacturer",
		companyNameHeader, "Acme Chargers",
	)

	identity := callWithMetadata(t, "secret", md)
	if identity == nil {
		t.Fatal("expected identity, got nil")
	}

	if identity.ID != "user-1" || identity.Email != "user@example.com" ||
		identity.UserType != "manufacturer" || identity.CompanyName != "Acme Chargers" {
		t.Fatalf("unexpected identity: %+v", identity)
	}
}

func TestUnaryInterceptor_ValidSecretNoUserID(t *testing.T) {
	md := metadata.Pairs(gatewaySecretHeader, "secret")

	identity := callWithMetadata(t, "secret", md)
	if identity != nil {
		t.Fatalf("expected no identity without a user id, got %+v", identity)
	}
}

func TestRequireIdentity(t *testing.T) {
	if _, err := RequireIdentity(context.Background()); err == nil {
		t.Fatal("expected error for missing identity")
	}

	ctx := WithIdentity(context.Background(), &Identity{ID: "user-1"})
	identity, err := RequireIdentity(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if identity.ID != "user-1" {
		t.Fatalf("unexpected identity: %+v", identity)
	}
}
