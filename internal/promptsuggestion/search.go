package promptsuggestion

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// chargerTypes mirrors search_chargers' documented chargerType values (internal/mcp/server.go).
// The empty string means "unfiltered" - included so a chargers/comparison regeneration cycle
// isn't always narrowed to one type.
var chargerTypes = []string{"", "AC", "DC", "portable-evse", "wireless"}

const maxSearchChargersPageSize = 200

// searchRandomChargers calls search_chargers with a randomized chargerType and a page size
// sized to comfortably source want distinct chargers, so each regeneration samples a different
// slice of the catalog. If a randomly chosen chargerType happens to match fewer than minResults
// chargers (e.g. a small catalog that doesn't have every type represented, or has too few of
// the type drawn), it retries once, unfiltered, rather than failing the whole regeneration over
// an unlucky filter draw - callers ask for the minimum they can actually do useful work with
// (e.g. 1 for a single-charger fact, 2 for a comparison pair).
func searchRandomChargers(ctx context.Context, caller MCPToolCaller, rng *rand.Rand, want, minResults int) (internalmcp.SearchChargersOutput, error) {
	ctx, span := tracer.Start(ctx, "promptsuggestion.searchRandomChargers")
	defer span.End()

	pageSize := want * 3
	if pageSize > maxSearchChargersPageSize {
		pageSize = maxSearchChargersPageSize
	}

	chargerType := chargerTypes[rng.IntN(len(chargerTypes))]
	span.SetAttributes(chargerTypeAttr(chargerType), pageSizeAttr(pageSize))

	out, err := callSearchChargers(ctx, caller, chargerType, pageSize)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return internalmcp.SearchChargersOutput{}, err
	}

	retried := false
	if len(out.Chargers) < minResults && chargerType != "" {
		retried = true

		out, err = callSearchChargers(ctx, caller, "", pageSize)
		if err != nil {
			span.SetAttributes(retriedUnfilteredAttr(true))
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())

			return internalmcp.SearchChargersOutput{}, err
		}
	}

	span.SetAttributes(retriedUnfilteredAttr(retried), resultCountAttr(len(out.Chargers)))

	return out, nil
}

func callSearchChargers(ctx context.Context, caller MCPToolCaller, chargerType string, pageSize int) (internalmcp.SearchChargersOutput, error) {
	ctx, span := tracer.Start(ctx, "promptsuggestion.callSearchChargers", trace.WithAttributes(chargerTypeAttr(chargerType), pageSizeAttr(pageSize)))
	defer span.End()

	args := map[string]any{"pageSize": pageSize}
	if chargerType != "" {
		args["chargerType"] = chargerType
	}

	result, err := caller.CallTool(ctx, "search_chargers", args)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return internalmcp.SearchChargersOutput{}, fmt.Errorf("search_chargers: %w", err)
	}

	var out internalmcp.SearchChargersOutput
	if err := json.Unmarshal(result.RawStructuredContent, &out); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return internalmcp.SearchChargersOutput{}, fmt.Errorf("decode search_chargers result: %w", err)
	}

	span.SetAttributes(resultCountAttr(len(out.Chargers)))

	return out, nil
}

// distinctIndices returns up to n distinct, randomly ordered indices into [0, count) - used to
// pick which chargers (or pairs of chargers) ground each pool item without repeats.
func distinctIndices(rng *rand.Rand, count, n int) []int {
	if n > count {
		n = count
	}

	perm := rng.Perm(count)

	return perm[:n]
}
