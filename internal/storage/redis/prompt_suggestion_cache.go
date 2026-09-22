package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/promptsuggestion"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var promptSuggestionTracer = otel.Tracer("promptsuggestion.cache")

// PromptSuggestionCache holds one JSON-encoded pool of suggestions per topic. Its TTL is the
// window a pool stays fresh for - expiry is what triggers promptsuggestion.Service to
// regenerate that topic, there is no separate refresh job.
type PromptSuggestionCache struct {
	client *redis.Client
	ttl    time.Duration
}

func NewPromptSuggestionCache(client *redis.Client, ttl time.Duration) *PromptSuggestionCache {
	return &PromptSuggestionCache{client: client, ttl: ttl}
}

func promptSuggestionCacheKey(topic promptsuggestion.Topic) string {
	return fmt.Sprintf("promptsuggestion:pool:%s", topic)
}

// Get returns (_, false, nil) on a miss (never cached, or TTL-evicted) - only a real Redis
// failure is an error.
func (c *PromptSuggestionCache) Get(ctx context.Context, topic promptsuggestion.Topic) ([]promptsuggestion.Suggestion, bool, error) {
	key := promptSuggestionCacheKey(topic)

	ctx, span := promptSuggestionTracer.Start(ctx, "cache.Get", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	raw, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			span.SetAttributes(attribute.Bool("cache.hit", false))

			return nil, false, nil
		}

		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, false, fmt.Errorf("cache get: %w", err)
	}

	var pool []promptsuggestion.Suggestion
	if err := json.Unmarshal(raw, &pool); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, false, fmt.Errorf("decode cached pool: %w", err)
	}

	span.SetAttributes(attribute.Bool("cache.hit", true))

	return pool, true, nil
}

func (c *PromptSuggestionCache) Set(ctx context.Context, topic promptsuggestion.Topic, suggestions []promptsuggestion.Suggestion) error {
	key := promptSuggestionCacheKey(topic)

	ctx, span := promptSuggestionTracer.Start(ctx, "cache.Set", trace.WithAttributes(attribute.String("cache.key", key)))
	defer span.End()

	raw, err := json.Marshal(suggestions)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("encode pool: %w", err)
	}

	if err := c.client.Set(ctx, key, raw, c.ttl).Err(); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("cache set: %w", err)
	}

	return nil
}
