package promptsuggestion

import (
	"context"
	"fmt"
	"math/rand/v2"
)

// generateChargers sources want random real chargers via search_chargers (searchRandomChargers
// handles randomizing the call itself), extracts one random grounding fact from each, and asks
// the LLM for one suggestion per fact in a single batched call.
func generateChargers(ctx context.Context, chatModel ChatModel, caller MCPToolCaller, rng *rand.Rand, want int) ([]Suggestion, error) {
	result, err := searchRandomChargers(ctx, caller, rng, want, 1)
	if err != nil {
		return nil, err
	}

	facts := make([]chargerFact, 0, want)
	for _, i := range distinctIndices(rng, len(result.Chargers), len(result.Chargers)) {
		if len(facts) == want {
			break
		}

		if fact, ok := extractFact(result.Chargers[i], rng); ok {
			facts = append(facts, fact)
		}
	}

	if len(facts) == 0 {
		return nil, fmt.Errorf("no charger in the search_chargers result had a usable attribute")
	}

	userPrompt, err := renderTemplate(chargersUserTemplate, struct{ Facts []chargerFact }{Facts: facts})
	if err != nil {
		return nil, err
	}

	texts, err := generateSuggestionPool(ctx, chatModel, chargersSystemPrompt, userPrompt, len(facts))
	if err != nil {
		return nil, err
	}

	return toSuggestions(TopicChargers, texts), nil
}
