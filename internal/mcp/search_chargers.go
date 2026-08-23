package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
)

// FieldFilterInput matches charger.FieldFilter: it lets a caller filter on any field of
// the OECS charger spec, not just the ones with a dedicated input below.
type FieldFilterInput struct {
	Field  string   `json:"field" jsonschema:"dot-path to an OECS spec field, e.g. hardware.housing.material, hardware.connectors.type, or software.protocols.name"`
	Values []string `json:"values" jsonschema:"candidate values for the field; matches if the field equals any one of them"`
}

type SearchChargersInput struct {
	Query          string             `json:"query,omitempty" jsonschema:"free-text search across manufacturer name, model name, and product series"`
	ManufacturerID string             `json:"manufacturerId,omitempty" jsonschema:"restrict results to one manufacturer, by UUID - not part of the OECS spec, so it can't be expressed via fields"`
	ChargerType    string             `json:"chargerType,omitempty" jsonschema:"AC, DC, portable-evse, or wireless"`
	Fields         []FieldFilterInput `json:"fields,omitempty" jsonschema:"generic filters over any OECS spec field, by dot-path and candidate values (e.g. field \"hardware.connectors.type\" values [\"CCS2_Combo2\"], or \"manufacturer.country\" values [\"DE\"]); distinct entries are AND-matched together"`
	PageSize       int                `json:"pageSize,omitempty" jsonschema:"max results to return (default 50, max 200)"`
	PageToken      string             `json:"pageToken,omitempty" jsonschema:"opaque pagination cursor from a previous response's nextPageToken"`
}

type ChargerSummaryOutput struct {
	ID                  string `json:"id"`
	ManufacturerID      string `json:"manufacturerId,omitempty"`
	ManufacturerName    string `json:"manufacturerName"`
	ManufacturerCountry string `json:"manufacturerCountry,omitempty"`
	// Spec is the full OECS charger spec document (https://github.com/xBlaz3kx/oecs).
	Spec any `json:"spec"`
}

type SearchChargersOutput struct {
	Chargers      []ChargerSummaryOutput `json:"chargers"`
	TotalSize     int64                  `json:"totalSize"`
	NextPageToken string                 `json:"nextPageToken,omitempty"`
}

type searchChargersHandler struct {
	chargers ChargerSearcher
}

func newSearchChargersHandler(chargers ChargerSearcher) *searchChargersHandler {
	return &searchChargersHandler{chargers: chargers}
}

func (h *searchChargersHandler) Handle(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var in SearchChargersInput
	if err := req.BindArguments(&in); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to bind arguments: %v", err)), nil
	}

	filters, err := searchChargersFilters(in)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	offset, err := pagination.DecodeOffset(in.PageToken)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid pageToken: %v", err)), nil
	}

	limit := pagination.ClampPageSize(in.PageSize, charger.DefaultPageSize, charger.MaxPageSize)

	results, total, err := h.chargers.SearchByFields(ctx, filters, limit, offset)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	out := SearchChargersOutput{
		Chargers:      make([]ChargerSummaryOutput, len(results)),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(results), total),
	}

	for i, c := range results {
		co, err := chargerToOutput(c)
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}

		out.Chargers[i] = co
	}

	return &mcp.CallToolResult{Content: []mcp.Content{}, StructuredContent: out}, nil
}

func searchChargersFilters(in SearchChargersInput) (charger.FieldSearchFilters, error) {
	filters := charger.FieldSearchFilters{
		Statuses: []charger.Status{charger.StatusVerified},
	}

	if in.Query != "" {
		filters.Query = &in.Query
	}

	if in.ChargerType != "" {
		filters.ChargerType = &in.ChargerType
	}

	if in.ManufacturerID != "" {
		id, err := uuid.Parse(in.ManufacturerID)
		if err != nil {
			return charger.FieldSearchFilters{}, fmt.Errorf("invalid manufacturerId: %w", err)
		}

		filters.ManufacturerID = &id
	}

	for _, f := range in.Fields {
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field:  f.Field,
			Values: f.Values,
		})
	}

	return filters, nil
}

func chargerToOutput(c *charger.Charger) (ChargerSummaryOutput, error) {
	manufacturerID := ""
	if c.ManufacturerID != nil {
		manufacturerID = c.ManufacturerID.String()
	}

	var spec any
	if err := json.Unmarshal(c.Spec, &spec); err != nil {
		return ChargerSummaryOutput{}, fmt.Errorf("unmarshal spec for charger %s: %w", c.ID, err)
	}

	return ChargerSummaryOutput{
		ID:                  c.ID.String(),
		ManufacturerID:      manufacturerID,
		ManufacturerName:    c.ManufacturerName,
		ManufacturerCountry: c.ManufacturerCountry,
		Spec:                spec,
	}, nil
}
