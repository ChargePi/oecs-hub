package grpc

import (
	"context"
	"testing"

	promptsv1 "github.com/ChargePi/oecs-hub/gen/proto/prompts/v1"
	"github.com/ChargePi/oecs-hub/internal/promptsuggestion"
)

type fakePromptSuggestionSource struct {
	pools map[promptsuggestion.Topic][]promptsuggestion.Suggestion
}

func (f *fakePromptSuggestionSource) GetPool(_ context.Context, topic promptsuggestion.Topic) ([]promptsuggestion.Suggestion, error) {
	return f.pools[topic], nil
}

// Sample returns the whole pool (no randomness), so tests can assert exact contents.
func (f *fakePromptSuggestionSource) Sample(pool []promptsuggestion.Suggestion) []promptsuggestion.Suggestion {
	return pool
}

func newFakeSource() *fakePromptSuggestionSource {
	return &fakePromptSuggestionSource{pools: map[promptsuggestion.Topic][]promptsuggestion.Suggestion{
		promptsuggestion.TopicGeneral:    {{Topic: promptsuggestion.TopicGeneral, Text: "What is OCPP?"}},
		promptsuggestion.TopicChargers:   {{Topic: promptsuggestion.TopicChargers, Text: "Tell me about Acme ChargeMax"}},
		promptsuggestion.TopicComparison: {{Topic: promptsuggestion.TopicComparison, Text: "Acme vs Beta?"}},
	}}
}

func TestPromptSuggestionHandler_ListPromptSuggestions(t *testing.T) {
	t.Run("empty topics returns all three", func(t *testing.T) {
		h := NewPromptSuggestionHandler(newFakeSource())

		resp, err := h.ListPromptSuggestions(context.Background(), &promptsv1.ListPromptSuggestionsRequest{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(resp.GetSuggestions()) != 3 {
			t.Fatalf("expected 3 suggestions, got %d", len(resp.GetSuggestions()))
		}
	})

	t.Run("unspecified-only topics returns all three", func(t *testing.T) {
		h := NewPromptSuggestionHandler(newFakeSource())

		resp, err := h.ListPromptSuggestions(context.Background(), &promptsv1.ListPromptSuggestionsRequest{
			Topics: []promptsv1.PromptTopic{promptsv1.PromptTopic_PROMPT_TOPIC_UNSPECIFIED},
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(resp.GetSuggestions()) != 3 {
			t.Fatalf("expected 3 suggestions, got %d", len(resp.GetSuggestions()))
		}
	})

	t.Run("a subset of topics returns only those", func(t *testing.T) {
		h := NewPromptSuggestionHandler(newFakeSource())

		resp, err := h.ListPromptSuggestions(context.Background(), &promptsv1.ListPromptSuggestionsRequest{
			Topics: []promptsv1.PromptTopic{
				promptsv1.PromptTopic_PROMPT_TOPIC_CHARGERS,
				promptsv1.PromptTopic_PROMPT_TOPIC_CHARGERS, // duplicate, should not double up
			},
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(resp.GetSuggestions()) != 1 {
			t.Fatalf("expected 1 suggestion, got %d", len(resp.GetSuggestions()))
		}

		if got := resp.GetSuggestions()[0].GetTopic(); got != promptsv1.PromptTopic_PROMPT_TOPIC_CHARGERS {
			t.Fatalf("expected chargers topic, got %v", got)
		}
	})
}
