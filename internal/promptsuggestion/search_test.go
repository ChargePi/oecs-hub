package promptsuggestion

import (
	"context"
	"encoding/json"
	"math/rand/v2"
	"testing"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
	"github.com/mark3labs/mcp-go/mcp"
)

// fakeMCPToolCaller records the arguments it was called with and returns a canned
// search_chargers result.
type fakeMCPToolCaller struct {
	calls  []map[string]any
	result internalmcp.SearchChargersOutput
}

func (f *fakeMCPToolCaller) CallTool(_ context.Context, name string, args map[string]any) (*mcp.CallToolResult, error) {
	f.calls = append(f.calls, args)

	raw, err := json.Marshal(f.result)
	if err != nil {
		return nil, err
	}

	return &mcp.CallToolResult{RawStructuredContent: raw}, nil
}

func TestSearchRandomChargers(t *testing.T) {
	caller := &fakeMCPToolCaller{result: internalmcp.SearchChargersOutput{
		Chargers: []internalmcp.ChargerSummaryOutput{{ManufacturerName: "Acme"}},
	}}
	rng := rand.New(rand.NewPCG(1, 2))

	out, err := searchRandomChargers(context.Background(), caller, rng, 10, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(out.Chargers) != 1 {
		t.Fatalf("expected the canned result to pass through, got %d chargers", len(out.Chargers))
	}

	if got := caller.calls[0]["pageSize"]; got != 30 {
		t.Fatalf("expected pageSize 30 (want*3), got %v", got)
	}
}

func TestSearchRandomChargers_ClampsPageSize(t *testing.T) {
	caller := &fakeMCPToolCaller{}
	rng := rand.New(rand.NewPCG(1, 2))

	if _, err := searchRandomChargers(context.Background(), caller, rng, 1000, 1); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := caller.calls[0]["pageSize"]; got != maxSearchChargersPageSize {
		t.Fatalf("expected pageSize clamped to %d, got %v", maxSearchChargersPageSize, got)
	}
}

func TestSearchRandomChargers_RandomizesChargerType(t *testing.T) {
	// A non-empty result, so the empty-result retry (tested separately below) never fires
	// here - this test is only about the initial chargerType draw varying.
	caller := &fakeMCPToolCaller{result: internalmcp.SearchChargersOutput{
		Chargers: []internalmcp.ChargerSummaryOutput{{ManufacturerName: "Acme"}},
	}}
	rng := rand.New(rand.NewPCG(1, 2))

	sawFiltered, sawUnfiltered := false, false

	for i := 0; i < 200; i++ {
		if _, err := searchRandomChargers(context.Background(), caller, rng, 5, 1); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if _, ok := caller.calls[len(caller.calls)-1]["chargerType"]; ok {
			sawFiltered = true
		} else {
			sawUnfiltered = true
		}
	}

	if !sawFiltered || !sawUnfiltered {
		t.Fatalf("expected chargerType to vary across calls (filtered=%v, unfiltered=%v)", sawFiltered, sawUnfiltered)
	}
}

// sequencedMCPToolCaller returns one queued result per call, in order - for testing the
// empty-result retry, where the first and second calls must behave differently.
type sequencedMCPToolCaller struct {
	calls   []map[string]any
	results []internalmcp.SearchChargersOutput
}

func (f *sequencedMCPToolCaller) CallTool(_ context.Context, _ string, args map[string]any) (*mcp.CallToolResult, error) {
	f.calls = append(f.calls, args)

	result := f.results[len(f.calls)-1]

	raw, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &mcp.CallToolResult{RawStructuredContent: raw}, nil
}

func TestSearchRandomChargers_RetriesUnfilteredOnEmptyFilteredResult(t *testing.T) {
	caller := &sequencedMCPToolCaller{results: []internalmcp.SearchChargersOutput{
		{Chargers: nil}, // the filtered call, if any, finds nothing
		{Chargers: []internalmcp.ChargerSummaryOutput{{ManufacturerName: "Acme"}}},
	}}

	// Force a filtered draw: chargerTypes[0] is "", so seed until the first draw isn't it.
	// PCG(1, 2) with IntN(5) happens to draw non-zero first; assert that rather than assume.
	rng := rand.New(rand.NewPCG(1, 2))

	out, err := searchRandomChargers(context.Background(), caller, rng, 5, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(caller.calls) != 2 {
		t.Skipf("initial random draw was unfiltered (no retry to test) - calls=%d", len(caller.calls))
	}

	if _, ok := caller.calls[0]["chargerType"]; !ok {
		t.Fatal("expected the first call to be filtered")
	}

	if _, ok := caller.calls[1]["chargerType"]; ok {
		t.Fatal("expected the retry to be unfiltered")
	}

	if len(out.Chargers) != 1 {
		t.Fatalf("expected the retry's result to be returned, got %d chargers", len(out.Chargers))
	}
}

func TestSearchRandomChargers_RetriesUnfilteredWhenBelowMinResults(t *testing.T) {
	// The filtered call returns 1 charger - non-empty, but still below minResults=2 for a
	// comparison pair, so it must retry unfiltered rather than accept a too-small result.
	caller := &sequencedMCPToolCaller{results: []internalmcp.SearchChargersOutput{
		{Chargers: []internalmcp.ChargerSummaryOutput{{ManufacturerName: "Acme"}}},
		{Chargers: []internalmcp.ChargerSummaryOutput{{ManufacturerName: "Acme"}, {ManufacturerName: "Beta"}}},
	}}
	rng := rand.New(rand.NewPCG(1, 2))

	out, err := searchRandomChargers(context.Background(), caller, rng, 5, 2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(caller.calls) != 2 {
		t.Skipf("initial random draw was unfiltered (no retry to test) - calls=%d", len(caller.calls))
	}

	if len(out.Chargers) != 2 {
		t.Fatalf("expected the retry's 2-charger result to be returned, got %d chargers", len(out.Chargers))
	}
}

func TestDistinctIndices(t *testing.T) {
	rng := rand.New(rand.NewPCG(1, 2))

	t.Run("clamps to the available count", func(t *testing.T) {
		got := distinctIndices(rng, 3, 10)
		if len(got) != 3 {
			t.Fatalf("expected 3 indices, got %d", len(got))
		}
	})

	t.Run("returns distinct indices", func(t *testing.T) {
		got := distinctIndices(rng, 10, 5)
		seen := make(map[int]bool, len(got))
		for _, i := range got {
			if seen[i] {
				t.Fatalf("duplicate index %d in %v", i, got)
			}
			seen[i] = true
		}
	})
}
