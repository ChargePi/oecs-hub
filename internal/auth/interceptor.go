package auth

import (
	"context"

	"github.com/google/uuid"
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

	return IdentityFromHeaders(func(key string) string { return firstValue(md, key) }, gatewaySecret)
}

// IdentityFromHeaders applies the same trust rule as UnaryInterceptor to any header
// source (gRPC metadata, an HTTP request's headers): x-user-* is honored only alongside a
// matching x-gateway-secret, otherwise the caller is anonymous (nil).
func IdentityFromHeaders(get func(key string) string, gatewaySecret string) *Identity {
	if get(gatewaySecretHeader) != gatewaySecret {
		return nil
	}

	id := get(userIDHeader)
	if id == "" {
		return nil
	}

	return &Identity{
		ID:       id,
		Email:    get(userEmailHeader),
		UserType: get(userTypeHeader),
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

// RequireUserChargersIdentity resolves the authenticated caller and rejects anyone who
// isn't an individual or business account, returning their identity ID for scoping
// favorites, projects, ratings and pending actions. Shared by the gRPC handlers and the
// MCP user tools so both enforce the same eligibility rule.
func RequireUserChargersIdentity(ctx context.Context) (uuid.UUID, error) {
	identity, err := RequireIdentity(ctx)
	if err != nil {
		return uuid.Nil, err
	}

	if !identity.HasUserChargers() {
		return uuid.Nil, status.Error(codes.PermissionDenied, "only individual and business accounts can access this API")
	}

	identityID, err := uuid.Parse(identity.ID)
	if err != nil {
		return uuid.Nil, status.Error(codes.Internal, "invalid identity id from proxy")
	}

	return identityID, nil
}
