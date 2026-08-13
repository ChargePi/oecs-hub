package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var chargerTracer = otel.Tracer("charger.cache")

type ChargerCache struct {
	client *redis.Client
	ttl    time.Duration
}

func NewChargerCache(client *redis.Client, ttl time.Duration) *ChargerCache {
	return &ChargerCache{client: client, ttl: ttl}
}

func chargerCacheKey(id uuid.UUID) string {
	return fmt.Sprintf("charger:%s", id)
}

func (c *ChargerCache) Get(ctx context.Context, id uuid.UUID) (*charger.Charger, error) {
	key := chargerCacheKey(id)

	ctx, span := chargerTracer.Start(ctx, "cache.Get", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			span.SetAttributes(attribute.Bool("cache.hit", false))

			return nil, charger.ErrNotFound
		}

		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("cache get: %w", err)
	}

	var c2 charger.Charger
	if err := json.Unmarshal(data, &c2); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("cache unmarshal: %w", err)
	}

	span.SetAttributes(attribute.Bool("cache.hit", true))

	return &c2, nil
}

func (c *ChargerCache) Set(ctx context.Context, ch *charger.Charger) error {
	key := chargerCacheKey(ch.ID)

	ctx, span := chargerTracer.Start(ctx, "cache.Set", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	data, err := json.Marshal(ch)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("cache marshal: %w", err)
	}

	if err := c.client.Set(ctx, key, data, c.ttl).Err(); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("cache set: %w", err)
	}

	return nil
}

func (c *ChargerCache) Delete(ctx context.Context, id uuid.UUID) error {
	key := chargerCacheKey(id)

	ctx, span := chargerTracer.Start(ctx, "cache.Delete", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	err := c.client.Del(ctx, key).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("cache delete: %w", err)
	}

	return nil
}
