// Package entitlement answers "is this caller on a paid plan?" for the features that are
// gated on one. It is the only place in this backend that talks to oecs-billing-service.
//
// There is no local plans table: Lago is the system of record, and BillingService derives
// the tier from the caller's active subscription. Every BillingService RPC is
// self-service - none takes a customer id - so this package calls it the way the edge
// would, forwarding the caller's identity headers plus the shared gateway secret that
// makes the billing service trust them (its config requires the same secret as ours; see
// internal/auth).
package entitlement

import (
	"context"
	"errors"
	"fmt"

	billingv1 "github.com/ChargePi/oecs-hub/gen/proto/billing/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

var tracer = otel.Tracer("entitlement.service")

// ErrUnknownTier means billing answered but didn't say which tier the caller is on -
// treated as a failure to determine the plan, never as "free". A freshly registered
// account can land here: kratos.yml documents the registration webhook that provisions the
// Lago customer as intermittently failing.
var ErrUnknownTier = errors.New("billing did not report a plan tier")

const (
	gatewaySecretHeader = "x-gateway-secret"
	userIDHeader        = "x-user-id"
	userEmailHeader     = "x-user-email"
	userTypeHeader      = "x-user-type"
)

// BillingClient is the slice of billing.v1.BillingService this package uses.
type BillingClient interface {
	GetUsage(ctx context.Context, in *billingv1.GetUsageRequest, opts ...grpc.CallOption) (*billingv1.GetUsageResponse, error)
}

// TierCache memoizes a caller's tier. Implemented by redis.TierCache. A miss is
// (false, nil); errors are non-fatal and only cost a round trip to billing.
type TierCache interface {
	Get(ctx context.Context, identityID string) (billingv1.PlanTier, bool, error)
	Set(ctx context.Context, identityID string, tier billingv1.PlanTier) error
}

type Service struct {
	billing       BillingClient
	cache         TierCache
	gatewaySecret string
}

func NewService(billing BillingClient, cache TierCache, gatewaySecret string) *Service {
	return &Service{billing: billing, cache: cache, gatewaySecret: gatewaySecret}
}

// HasPaidPlan reports whether the caller holds a paid plan. An error means the plan could
// not be determined - callers must not read that as "free".
func (s *Service) HasPaidPlan(ctx context.Context) (bool, error) {
	tier, err := s.Tier(ctx)
	if err != nil {
		return false, err
	}

	return tier == billingv1.PlanTier_PLAN_TIER_PAID, nil
}

// Tier returns the caller's plan tier, cache-aside.
func (s *Service) Tier(ctx context.Context) (billingv1.PlanTier, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return billingv1.PlanTier_PLAN_TIER_UNSPECIFIED, err
	}

	ctx, span := tracer.Start(ctx, "entitlement.Tier",
		trace.WithAttributes(attribute.String("entitlement.identity.id", identity.ID)))
	defer span.End()

	cached, ok, err := s.cache.Get(ctx, identity.ID)
	if err != nil {
		// A broken cache shouldn't gate a paid feature - fall through to billing.
		span.RecordError(err)
	}

	if ok && err == nil {
		span.SetAttributes(attribute.Bool("cache.hit", true))

		return cached, nil
	}

	span.SetAttributes(attribute.Bool("cache.hit", false))

	usage, err := s.billing.GetUsage(s.withIdentity(ctx, identity), &billingv1.GetUsageRequest{})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return billingv1.PlanTier_PLAN_TIER_UNSPECIFIED, fmt.Errorf("get usage: %w", err)
	}

	tier := usage.GetTier()
	if tier == billingv1.PlanTier_PLAN_TIER_UNSPECIFIED {
		span.SetStatus(codes.Error, ErrUnknownTier.Error())

		return tier, ErrUnknownTier
	}

	_ = s.cache.Set(ctx, identity.ID, tier)

	return tier, nil
}

// withIdentity re-emits the identity headers the edge injected on the way in, so the
// billing service's own header-trust interceptor resolves the same caller.
func (s *Service) withIdentity(ctx context.Context, identity *auth.Identity) context.Context {
	return metadata.AppendToOutgoingContext(ctx,
		gatewaySecretHeader, s.gatewaySecret,
		userIDHeader, identity.ID,
		userEmailHeader, identity.Email,
		userTypeHeader, identity.UserType,
	)
}
