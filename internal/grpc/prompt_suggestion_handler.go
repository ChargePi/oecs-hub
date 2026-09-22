package grpc

import (
	"context"

	promptsv1 "github.com/ChargePi/oecs-hub/gen/proto/prompts/v1"
	"github.com/ChargePi/oecs-hub/internal/promptsuggestion"
)

// PromptSuggestionSource is the subset of promptsuggestion.Service the handler needs.
type PromptSuggestionSource interface {
	GetPool(ctx context.Context, topic promptsuggestion.Topic) ([]promptsuggestion.Suggestion, error)
	Sample(pool []promptsuggestion.Suggestion) []promptsuggestion.Suggestion
}

var topicFromProto = map[promptsv1.PromptTopic]promptsuggestion.Topic{
	promptsv1.PromptTopic_PROMPT_TOPIC_GENERAL:    promptsuggestion.TopicGeneral,
	promptsv1.PromptTopic_PROMPT_TOPIC_CHARGERS:   promptsuggestion.TopicChargers,
	promptsv1.PromptTopic_PROMPT_TOPIC_COMPARISON: promptsuggestion.TopicComparison,
}

var topicToProto = map[promptsuggestion.Topic]promptsv1.PromptTopic{
	promptsuggestion.TopicGeneral:    promptsv1.PromptTopic_PROMPT_TOPIC_GENERAL,
	promptsuggestion.TopicChargers:   promptsv1.PromptTopic_PROMPT_TOPIC_CHARGERS,
	promptsuggestion.TopicComparison: promptsv1.PromptTopic_PROMPT_TOPIC_COMPARISON,
}

// PromptSuggestionHandler implements prompts.v1.PromptSuggestionsService. Public,
// unauthenticated - there is nothing caller-specific about suggested prompts.
type PromptSuggestionHandler struct {
	promptsv1.UnimplementedPromptSuggestionsServiceServer

	suggestions PromptSuggestionSource
}

func NewPromptSuggestionHandler(suggestions PromptSuggestionSource) *PromptSuggestionHandler {
	return &PromptSuggestionHandler{suggestions: suggestions}
}

func (h *PromptSuggestionHandler) ListPromptSuggestions(ctx context.Context, req *promptsv1.ListPromptSuggestionsRequest) (*promptsv1.ListPromptSuggestionsResponse, error) {
	topics := requestedTopics(req.GetTopics())

	resp := &promptsv1.ListPromptSuggestionsResponse{}

	for _, topic := range topics {
		pool, err := h.suggestions.GetPool(ctx, topic)
		if err != nil {
			// A failed topic (e.g. persistent LLM/MCP failure) doesn't fail the whole
			// response - the other topics' chips still render, and this one is just
			// skipped rather than the UI's empty state showing nothing at all.
			continue
		}

		for _, s := range h.suggestions.Sample(pool) {
			resp.Suggestions = append(resp.Suggestions, &promptsv1.PromptSuggestion{
				Topic: topicToProto[s.Topic],
				Text:  s.Text,
			})
		}
	}

	return resp, nil
}

// requestedTopics returns every topic named in protoTopics (deduplicated, ignoring
// PROMPT_TOPIC_UNSPECIFIED/unknown values), or every topic if protoTopics is empty or names
// only PROMPT_TOPIC_UNSPECIFIED.
func requestedTopics(protoTopics []promptsv1.PromptTopic) []promptsuggestion.Topic {
	seen := make(map[promptsuggestion.Topic]struct{}, len(protoTopics))

	var topics []promptsuggestion.Topic

	for _, pt := range protoTopics {
		topic, ok := topicFromProto[pt]
		if !ok {
			continue
		}

		if _, dup := seen[topic]; dup {
			continue
		}

		seen[topic] = struct{}{}
		topics = append(topics, topic)
	}

	if len(topics) == 0 {
		return promptsuggestion.Topics
	}

	return topics
}
