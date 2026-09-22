package promptsuggestion

import (
	"context"
	"fmt"
	"math/rand/v2"
)

type chargerPair struct {
	A chargerName
	B chargerName
}

// generateComparison sources up to 2*want random real chargers via search_chargers, pairs them
// up (no charger appears in more than one pair), and asks the LLM for one comparison suggestion
// per pair in a single batched call.
func generateComparison(ctx context.Context, chatModel ChatModel, caller MCPToolCaller, rng *rand.Rand, want int) ([]Suggestion, error) {
	result, err := searchRandomChargers(ctx, caller, rng, want*2, 2)
	if err != nil {
		return nil, err
	}

	names := make([]chargerName, 0, len(result.Chargers))
	for _, c := range result.Chargers {
		if name, ok := extractName(c); ok {
			names = append(names, name)
		}
	}

	indices := distinctIndices(rng, len(names), len(names))

	pairs := make([]chargerPair, 0, want)
	for i := 0; i+1 < len(indices) && len(pairs) < want; i += 2 {
		pairs = append(pairs, chargerPair{A: names[indices[i]], B: names[indices[i+1]]})
	}

	if len(pairs) == 0 {
		return nil, fmt.Errorf("search_chargers returned too few named chargers to form a comparison pair")
	}

	userPrompt, err := renderTemplate(comparisonUserTemplate, struct{ Pairs []chargerPair }{Pairs: pairs})
	if err != nil {
		return nil, err
	}

	texts, err := generateSuggestionPool(ctx, chatModel, comparisonSystemPrompt, userPrompt, len(pairs))
	if err != nil {
		return nil, err
	}

	return toSuggestions(TopicComparison, texts), nil
}
