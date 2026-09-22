package promptsuggestion

import "context"

// generateGeneral asks the LLM for want general EV-charging knowledge suggestions - no
// search_chargers call, since this topic is deliberately not about any specific charger.
func generateGeneral(ctx context.Context, chatModel ChatModel, want int) ([]Suggestion, error) {
	userPrompt, err := renderTemplate(generalUserTemplate, struct{ Count int }{Count: want})
	if err != nil {
		return nil, err
	}

	texts, err := generateSuggestionPool(ctx, chatModel, generalSystemPrompt, userPrompt, want)
	if err != nil {
		return nil, err
	}

	return toSuggestions(TopicGeneral, texts), nil
}

func toSuggestions(topic Topic, texts []string) []Suggestion {
	out := make([]Suggestion, len(texts))
	for i, t := range texts {
		out[i] = Suggestion{Topic: topic, Text: t}
	}

	return out
}
