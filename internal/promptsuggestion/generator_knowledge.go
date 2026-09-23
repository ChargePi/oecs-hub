package promptsuggestion

import "context"

// generateKnowledge asks the LLM for g.cfg.PoolSize general EV-charging knowledge
// suggestions - no search_chargers call, since ModeKnowledge is deliberately not about any
// specific charger.
func (g *generator) generateKnowledge(ctx context.Context) ([]Suggestion, error) {
	userPrompt, err := renderTemplate(generalUserTemplate, struct{ Count int }{Count: g.cfg.PoolSize})
	if err != nil {
		return nil, err
	}

	texts, err := generateSuggestionPool(ctx, g.chatModel, generalSystemPrompt, userPrompt, g.cfg.PoolSize)
	if err != nil {
		return nil, err
	}

	return toSuggestions(g.cfg.Topic, texts), nil
}
