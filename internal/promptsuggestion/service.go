package promptsuggestion

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"sync"

	"golang.org/x/sync/singleflight"
)

// Cache is the persistence Service reads a topic's pool from and writes a freshly-generated one
// into - implemented by internal/storage/redis's PromptSuggestionCache.
type Cache interface {
	// Get returns (_, false, nil) on a cache miss (never seen, or TTL-evicted) - only a real
	// backing-store failure is an error.
	Get(ctx context.Context, topic Topic) ([]Suggestion, bool, error)
	Set(ctx context.Context, topic Topic, suggestions []Suggestion) error
}

// Config configures how many suggestions Service generates/caches and returns per topic. See
// cmd/app's PromptSuggestionsConfig, which this is built from.
type Config struct {
	// PoolSize is how many distinct suggestions are generated and cached per topic on each
	// regeneration.
	PoolSize int
	// ReturnCount is how many of a topic's cached pool are randomly sampled and returned per
	// request.
	ReturnCount int
}

// Service is the cache-or-regenerate entry point for prompt suggestions. A cache miss (first
// request ever, or the cache's TTL evicted a stale pool) is what triggers regeneration - there
// is no background refresh job. Concurrent misses for the same topic are collapsed via
// singleflight, so a burst of requests right after eviction triggers one regeneration, not one
// per request.
type Service struct {
	chatModel ChatModel
	mcpCaller MCPToolCaller
	cache     Cache
	cfg       Config

	sf singleflight.Group
}

func NewService(chatModel ChatModel, mcpCaller MCPToolCaller, cache Cache, cfg Config) *Service {
	return &Service{chatModel: chatModel, mcpCaller: mcpCaller, cache: cache, cfg: cfg}
}

// GetPool returns topic's cached pool, regenerating it first on a miss.
func (s *Service) GetPool(ctx context.Context, topic Topic) ([]Suggestion, error) {
	if pool, hit, err := s.cache.Get(ctx, topic); err != nil {
		return nil, fmt.Errorf("get cached pool for %s: %w", topic, err)
	} else if hit {
		return pool, nil
	}

	pool, err, _ := s.sf.Do(string(topic), func() (any, error) {
		pool, err := s.regenerate(ctx, topic)
		if err != nil {
			return nil, err
		}

		if err := s.cache.Set(ctx, topic, pool); err != nil {
			return nil, fmt.Errorf("cache pool for %s: %w", topic, err)
		}

		return pool, nil
	})
	if err != nil {
		return nil, err
	}

	return pool.([]Suggestion), nil
}

// ListAll returns every topic's pool (regenerating any that are missing), one per topic key.
// Topics are independent: one failing (e.g. a transient LLM error) doesn't cancel the others'
// still-in-flight generation - unlike errgroup.WithContext, which would cancel every goroutine's
// context the moment the first one errors, discarding work the other topics had already
// completed or were about to. The returned map holds whichever topics succeeded; a non-nil
// error only ever reports what failed, for logging - callers that can tolerate a partial result
// (e.g. the gRPC handler, which already skips missing topics) should keep using the map even
// when err is non-nil.
func (s *Service) ListAll(ctx context.Context) (map[Topic][]Suggestion, error) {
	result := make(map[Topic][]Suggestion, len(Topics))

	var (
		mu   sync.Mutex
		wg   sync.WaitGroup
		errs []error
	)

	for _, topic := range Topics {
		wg.Add(1)

		go func() {
			defer wg.Done()

			pool, err := s.GetPool(ctx, topic)

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				errs = append(errs, fmt.Errorf("topic %s: %w", topic, err))
				return
			}

			result[topic] = pool
		}()
	}

	wg.Wait()

	return result, errors.Join(errs...)
}

// Sample randomly picks up to s.cfg.ReturnCount suggestions, without replacement, from pool -
// so repeated requests against the same cached pool can return different suggestions.
func (s *Service) Sample(pool []Suggestion) []Suggestion {
	n := s.cfg.ReturnCount
	if n > len(pool) {
		n = len(pool)
	}

	indices := rand.Perm(len(pool))[:n]
	out := make([]Suggestion, n)
	for i, idx := range indices {
		out[i] = pool[idx]
	}

	return out
}

func (s *Service) regenerate(ctx context.Context, topic Topic) ([]Suggestion, error) {
	rng := rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64()))

	switch topic {
	case TopicGeneral:
		return generateGeneral(ctx, s.chatModel, s.cfg.PoolSize)
	case TopicChargers:
		return generateChargers(ctx, s.chatModel, s.mcpCaller, rng, s.cfg.PoolSize)
	case TopicComparison:
		return generateComparison(ctx, s.chatModel, s.mcpCaller, rng, s.cfg.PoolSize)
	default:
		return nil, fmt.Errorf("unknown topic %q", topic)
	}
}
