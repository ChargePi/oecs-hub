package redis

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	billingv1 "github.com/ChargePi/oecs-hub/gen/proto/billing/v1"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tierTracer = otel.Tracer("entitlement.cache")

// TierCache memoizes plan tiers resolved from oecs-billing-service. The TTL is the window
// in which an upgrade or downgrade isn't reflected yet, so it is kept short.
type TierCache struct {
	client *redis.Client
	ttl    time.Duration
}

func NewTierCache(client *redis.Client, ttl time.Duration) *TierCache {
	return &TierCache{client: client, ttl: ttl}
}

func tierCacheKey(identityID string) string {
	return fmt.Sprintf("entitlement:tier:%s", identityID)
}

// Get returns the cached tier. A miss is (_, false, nil) - only a real Redis failure is an
// error.
func (c *TierCache) Get(ctx context.Context, identityID string) (billingv1.PlanTier, bool, error) {
	key := tierCacheKey(identityID)

	ctx, span := tierTracer.Start(ctx, "cache.Get", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	value, err := c.client.Get(ctx, key).Int()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			span.SetAttributes(attribute.Bool("cache.hit", false))

			return billingv1.PlanTier_PLAN_TIER_UNSPECIFIED, false, nil
		}

		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return billingv1.PlanTier_PLAN_TIER_UNSPECIFIED, false, fmt.Errorf("cache get: %w", err)
	}

	span.SetAttributes(attribute.Bool("cache.hit", true))

	return billingv1.PlanTier(value), true, nil
}

func (c *TierCache) Set(ctx context.Context, identityID string, tier billingv1.PlanTier) error {
	key := tierCacheKey(identityID)

	ctx, span := tierTracer.Start(ctx, "cache.Set", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	err := c.client.Set(ctx, key, strconv.Itoa(int(tier)), c.ttl).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("cache set: %w", err)
	}

	return nil
}
