package auth

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const (
	gatewaySecretHeader = "x-gateway-secret"
	userIDHeader        = "x-user-id"
	userEmailHeader     = "x-user-email"
	userTypeHeader      = "x-user-type"
	companyNameHeader   = "x-company-name"
)

// UnaryInterceptor trusts x-user-* headers only when x-gateway-secret matches
// gatewaySecret, proving the request was routed (and authenticated/authorized) through
// Traefik/Oathkeeper rather than hitting this port directly. A request that arrives
// without a valid secret is treated as anonymous, not rejected outright - most
// RegistryService RPCs are intentionally public; handlers that require an identity call
// RequireIdentity themselves.
func UnaryInterceptor(gatewaySecret string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		return handler(WithIdentity(ctx, identityFromMetadata(ctx, gatewaySecret)), req)
	}
}

func identityFromMetadata(ctx context.Context, gatewaySecret string) *Identity {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil
	}

	if firstValue(md, gatewaySecretHeader) != gatewaySecret {
		return nil
	}

	id := firstValue(md, userIDHeader)
	if id == "" {
		return nil
	}

	return &Identity{
		ID:          id,
		Email:       firstValue(md, userEmailHeader),
		UserType:    firstValue(md, userTypeHeader),
		CompanyName: firstValue(md, companyNameHeader),
	}
}

func firstValue(md metadata.MD, key string) string {
	values := md.Get(key)
	if len(values) == 0 {
		return ""
	}

	return values[0]
}

// RequireIdentity returns the caller's identity or codes.Unauthenticated if the request
// carries none - either it never went through the proxy, or the proxy found no Kratos
// session.
func RequireIdentity(ctx context.Context) (*Identity, error) {
	identity, ok := FromContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "authentication required")
	}

	return identity, nil
}
