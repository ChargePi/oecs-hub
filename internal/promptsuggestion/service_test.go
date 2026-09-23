package promptsuggestion

import (
	"context"
	"fmt"
	"sync"
	"testing"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

// fakeChatModel always returns a canned pool of generic suggestion strings, large enough that
// callers truncating to their own "want" never run out - it doesn't need to understand the
// prompt it was given.
type fakeChatModel struct {
	mu    sync.Mutex
	calls int
}

func (f *fakeChatModel) Generate(_ context.Context, _ []*schema.Message, _ ...model.Option) (*schema.Message, error) {
	f.mu.Lock()
	f.calls++
	f.mu.Unlock()

	items := make([]string, 20)
	for i := range items {
		items[i] = fmt.Sprintf(`"suggestion %d"`, i)
	}

	content := "[" + join(items, ",") + "]"

	return &schema.Message{Role: schema.Assistant, Content: content}, nil
}

func (f *fakeChatModel) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()

	return f.calls
}

func join(items []string, sep string) string {
	out := ""
	for i, s := range items {
		if i > 0 {
			out += sep
		}
		out += s
	}

	return out
}

// fakeCache is an in-memory Cache, so GetPool's miss-then-hit behavior can be exercised without
// Redis.
type fakeCache struct {
	mu    sync.Mutex
	pools map[Topic][]Suggestion
}

func newFakeCache() *fakeCache {
	return &fakeCache{pools: map[Topic][]Suggestion{}}
}

func (c *fakeCache) Get(_ context.Context, topic Topic) ([]Suggestion, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	pool, ok := c.pools[topic]

	return pool, ok, nil
}

func (c *fakeCache) Set(_ context.Context, topic Topic, suggestions []Suggestion) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.pools[topic] = suggestions

	return nil
}

func fakeChargers(n int) []internalmcp.ChargerSummaryOutput {
	out := make([]internalmcp.ChargerSummaryOutput, n)

	connectorTypes := []string{"CCS2_Combo2", "CHAdeMO", "Type2"}

	for i := range out {
		spec := map[string]any{
			"model":    map[string]any{"name": fmt.Sprintf("Model %d", i)},
			"hardware": map[string]any{"connectors": []map[string]any{{"type": connectorTypes[i%len(connectorTypes)]}}},
		}

		out[i] = internalmcp.ChargerSummaryOutput{ManufacturerName: fmt.Sprintf("Manufacturer %d", i), Spec: spec}
	}

	return out
}

func TestService_GetPool_RegeneratesOnMissThenCaches(t *testing.T) {
	chatModel := &fakeChatModel{}
	cache := newFakeCache()
	svc := NewService(chatModel, nil, cache, Config{PoolSize: 5, ReturnCount: 1})

	pool, err := svc.GetPool(context.Background(), TopicGeneral)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(pool) != 5 {
		t.Fatalf("expected pool of 5, got %d", len(pool))
	}

	if chatModel.callCount() != 1 {
		t.Fatalf("expected exactly 1 LLM call, got %d", chatModel.callCount())
	}

	// Second call should hit the now-populated cache, not call the LLM again.
	if _, err := svc.GetPool(context.Background(), TopicGeneral); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if chatModel.callCount() != 1 {
		t.Fatalf("expected still 1 LLM call after a cache hit, got %d", chatModel.callCount())
	}
}

func TestService_ListAll_CoversAllTopics(t *testing.T) {
	chatModel := &fakeChatModel{}
	mcpCaller := &fakeMCPToolCaller{result: internalmcp.SearchChargersOutput{Chargers: fakeChargers(30)}}
	cache := newFakeCache()
	svc := NewService(chatModel, mcpCaller, cache, Config{PoolSize: 4, ReturnCount: 1})

	pools, err := svc.ListAll(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, topic := range Topics {
		pool, ok := pools[topic]
		if !ok {
			t.Fatalf("missing pool for topic %s", topic)
		}

		if len(pool) != 4 {
			t.Fatalf("topic %s: expected pool of 4, got %d", topic, len(pool))
		}

		for _, s := range pool {
			if s.Topic != topic {
				t.Fatalf("topic %s: suggestion tagged with wrong topic %s", topic, s.Topic)
			}
		}
	}
}

func TestService_Sample(t *testing.T) {
	svc := NewService(nil, nil, nil, Config{PoolSize: 5, ReturnCount: 2})

	pool := []Suggestion{
		{Topic: TopicGeneral, Text: "a"},
		{Topic: TopicGeneral, Text: "b"},
		{Topic: TopicGeneral, Text: "c"},
	}

	sample := svc.Sample(pool)
	if len(sample) != 2 {
		t.Fatalf("expected 2 sampled suggestions, got %d", len(sample))
	}

	seen := map[string]bool{}
	for _, s := range sample {
		if seen[s.Text] {
			t.Fatalf("expected sampling without replacement, got duplicate %q", s.Text)
		}
		seen[s.Text] = true
	}

	t.Run("clamps to pool size when ReturnCount exceeds it", func(t *testing.T) {
		small := NewService(nil, nil, nil, Config{PoolSize: 5, ReturnCount: 10})

		sample := small.Sample(pool)
		if len(sample) != len(pool) {
			t.Fatalf("expected %d sampled suggestions, got %d", len(pool), len(sample))
		}
	})
}
