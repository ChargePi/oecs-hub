package promptsuggestion

import (
	"context"
	"fmt"
	"math/rand/v2"
	"text/template"

	"go.opentelemetry.io/otel/trace"
)

// generateCatalog sources real chargers via search_chargers, groups them into groupSize-sized
// groups (1 = one charger's facts per pool item, used by ModeCatalogSingle; 2 = a pair, used
// by ModeCatalogPair), and asks the LLM for one suggestion per group in a single batched call.
// Each group is handed every notable attribute this package found for its charger(s) - the LLM
// picks which one(s) are worth building the suggestion around, not this function.
func (g *generator) generateCatalog(ctx context.Context, groupSize int) ([]Suggestion, error) {
	ctx, span := tracer.Start(ctx, "promptsuggestion.generateCatalog", trace.WithAttributes(groupSizeAttr(groupSize)))
	defer span.End()

	rng := rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64()))

	result, err := searchRandomChargers(ctx, g.mcpCaller, rng, g.cfg.PoolSize*groupSize, groupSize)
	if err != nil {
		return nil, err
	}

	candidates := make([]chargerFacts, 0, len(result.Chargers))
	for _, c := range result.Chargers {
		facts, ok := extractFacts(c)
		if !ok {
			continue
		}

		// A single-charger item needs at least one attribute to ask about; a pair item can
		// still form a valid (if more generic) comparison question from names alone.
		if groupSize == 1 && len(facts.Attributes) == 0 {
			continue
		}

		candidates = append(candidates, facts)
	}

	indices := distinctIndices(rng, len(candidates), len(candidates))

	groups := make([][]chargerFacts, 0, g.cfg.PoolSize)
	for i := 0; i+groupSize <= len(indices) && len(groups) < g.cfg.PoolSize; i += groupSize {
		group := make([]chargerFacts, groupSize)
		for j := range groupSize {
			group[j] = candidates[indices[i+j]]
		}

		groups = append(groups, group)
	}

	if len(groups) == 0 {
		return nil, fmt.Errorf("search_chargers returned too few usable chargers to form a group of %d", groupSize)
	}

	span.SetAttributes(factCountAttr(len(candidates)), groupCountAttr(len(groups)))

	systemPrompt, userTemplate := catalogPrompts(groupSize)

	userPrompt, err := renderTemplate(userTemplate, struct{ Groups [][]chargerFacts }{Groups: groups})
	if err != nil {
		return nil, err
	}

	texts, err := generateSuggestionPool(ctx, g.chatModel, systemPrompt, userPrompt, len(groups))
	if err != nil {
		return nil, err
	}

	return toSuggestions(g.cfg.Topic, texts), nil
}

// catalogPrompts picks which templates ground a catalog generation call - groupSize 1 (a
// single charger's facts) uses the chargers-topic wording, 2 (a pair) the comparison-topic
// wording.
func catalogPrompts(groupSize int) (systemPrompt string, userTemplate *template.Template) {
	if groupSize == 2 {
		return comparisonSystemPrompt, comparisonUserTemplate
	}

	return chargersSystemPrompt, chargersUserTemplate
}
