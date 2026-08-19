// Package auth trusts identity headers injected by the Traefik/Oathkeeper edge - it
// never talks to Kratos itself. Session verification and authorization happen at the
// proxy layer (see deployments/docker/oathkeeper); this package only reads the result.
package auth

import "context"

// Identity is the caller identity forwarded by Oathkeeper's header mutator once it has
// verified a Kratos session.
type Identity struct {
	ID          string
	Email       string
	UserType    string
	CompanyName string
}

type identityContextKey struct{}

// WithIdentity returns a context carrying identity.
func WithIdentity(ctx context.Context, identity *Identity) context.Context {
	return context.WithValue(ctx, identityContextKey{}, identity)
}

// FromContext returns the identity stashed by the interceptor, if any.
func FromContext(ctx context.Context) (*Identity, bool) {
	identity, ok := ctx.Value(identityContextKey{}).(*Identity)
	return identity, ok && identity != nil
}
