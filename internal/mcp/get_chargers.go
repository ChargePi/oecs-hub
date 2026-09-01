package mcp

import (
	"context"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
)

type GetChargersInput struct {
	IDs []string `json:"ids" jsonschema:"charger IDs (UUIDs) to fetch, up to 200 per call"`
}

type GetChargersOutput struct {
	Chargers []ChargerSummaryOutput `json:"chargers"`
}

type getChargersHandler struct {
	chargers ChargerService
}

func newGetChargersHandler(chargers ChargerService) *getChargersHandler {
	return &getChargersHandler{chargers: chargers}
}

func (h *getChargersHandler) Handle(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var in GetChargersInput
	if err := req.BindArguments(&in); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to bind arguments: %v", err)), nil
	}

	if len(in.IDs) > charger.MaxPageSize {
		return mcp.NewToolResultError(fmt.Sprintf("ids: at most %d allowed per call", charger.MaxPageSize)), nil
	}

	ids := make([]uuid.UUID, 0, len(in.IDs))
	for _, raw := range in.IDs {
		// A malformed UUID is skipped, not a whole-batch error - the sole caller
		// builds ids from its own state, so one bad entry shouldn't fail the rest.
		if id, err := uuid.Parse(raw); err == nil {
			ids = append(ids, id)
		}
	}

	results, err := h.chargers.GetMany(ctx, ids)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	out := GetChargersOutput{Chargers: make([]ChargerSummaryOutput, 0, len(results))}
	for _, c := range results {
		co, err := chargerToOutput(c)
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		out.Chargers = append(out.Chargers, co)
	}

	return &mcp.CallToolResult{Content: []mcp.Content{}, StructuredContent: out}, nil
}
