package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var manufacturerTracer = otel.Tracer("manufacturer.cache")

type ManufacturerCache struct {
	client *redis.Client
	ttl    time.Duration
}

func NewManufacturerCache(client *redis.Client, ttl time.Duration) *ManufacturerCache {
	return &ManufacturerCache{client: client, ttl: ttl}
}

func manufacturerCacheKey(id uuid.UUID) string {
	return fmt.Sprintf("manufacturer:%s", id)
}

func (c *ManufacturerCache) Get(ctx context.Context, id uuid.UUID) (*manufacturer.Manufacturer, error) {
	key := manufacturerCacheKey(id)

	ctx, span := manufacturerTracer.Start(ctx, "cache.Get", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			span.SetAttributes(attribute.Bool("cache.hit", false))

			return nil, manufacturer.ErrNotFound
		}

		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("cache get: %w", err)
	}

	var m manufacturer.Manufacturer
	if err := json.Unmarshal(data, &m); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("cache unmarshal: %w", err)
	}

	span.SetAttributes(attribute.Bool("cache.hit", true))

	return &m, nil
}

func (c *ManufacturerCache) Set(ctx context.Context, m *manufacturer.Manufacturer) error {
	key := manufacturerCacheKey(m.ID)

	ctx, span := manufacturerTracer.Start(ctx, "cache.Set", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	data, err := json.Marshal(m)
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

func (c *ManufacturerCache) Delete(ctx context.Context, id uuid.UUID) error {
	key := manufacturerCacheKey(id)

	ctx, span := manufacturerTracer.Start(ctx, "cache.Delete", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	err := c.client.Del(ctx, key).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("cache delete: %w", err)
	}

	return nil
}
