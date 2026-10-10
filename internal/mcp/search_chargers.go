package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
)

// FieldFilterInput matches charger.FieldFilter: it lets a caller filter on any field of
// the OECS charger spec, not just the ones with a dedicated input below.
type FieldFilterInput struct {
	Field  string   `json:"field" jsonschema:"dot-path to an OECS spec field, e.g. hardware.housing.material, hardware.connectors.type, or software.protocols.name"`
	Values []string `json:"values" jsonschema:"candidate values for the field; matches if the field equals any one of them"`
}

type RatingFilterInput struct {
	Category   string  `json:"category" jsonschema:"rating category: reliability, support, design, or ease_of_use"`
	MinAverage float64 `json:"minAverage" jsonschema:"minimum average score across raters, 1 to 5"`
}

type SearchChargersInput struct {
	Query          string              `json:"query,omitempty" jsonschema:"free-text search: a manufacturer, model, or series name, or a natural-language description of what is needed (e.g. \"quiet wallbox with solar integration and OCPP 2.0.1\"); results are ordered by relevance"`
	ManufacturerID string              `json:"manufacturerId,omitempty" jsonschema:"restrict results to one manufacturer, by UUID - not part of the OECS spec, so it can't be expressed via fields"`
	ChargerType    string              `json:"chargerType,omitempty" jsonschema:"AC, DC, portable-evse, or wireless"`
	Fields         []FieldFilterInput  `json:"fields,omitempty" jsonschema:"generic filters over any OECS spec field, by dot-path and candidate values (e.g. field \"hardware.connectors.type\" values [\"CCS2_Combo2\"], or \"manufacturer.country\" values [\"DE\"]); distinct entries are AND-matched together"`
	MinRatings     []RatingFilterInput `json:"minRatings,omitempty" jsonschema:"minimum average user rating per category, AND-matched; unrated chargers never match (e.g. category \"reliability\" minAverage 4)"`
	PageSize       int                 `json:"pageSize,omitempty" jsonschema:"max results to return (default 50, max 200)"`
	PageToken      string              `json:"pageToken,omitempty" jsonschema:"opaque pagination cursor from a previous response's nextPageToken"`
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
	chargers ChargerService
}

func newSearchChargersHandler(chargers ChargerService) *searchChargersHandler {
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

	results, total, err := h.chargers.Search(ctx, filters, limit, offset)
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

func searchChargersFilters(in SearchChargersInput) (charger.SearchFilters, error) {
	filters := charger.SearchFilters{
		Statuses: []charger.Status{charger.StatusVerified},
	}

	if in.Query != "" {
		filters.Query = &in.Query
	}

	if in.ChargerType != "" {
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field: "model.type", Values: []string{in.ChargerType},
		})
	}

	if in.ManufacturerID != "" {
		id, err := uuid.Parse(in.ManufacturerID)
		if err != nil {
			return charger.SearchFilters{}, fmt.Errorf("invalid manufacturerId: %w", err)
		}

		filters.ManufacturerID = &id
	}

	for _, f := range in.Fields {
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field:  f.Field,
			Values: f.Values,
		})
	}

	for _, r := range in.MinRatings {
		filters.RatingFilters = append(filters.RatingFilters, charger.RatingFilter{
			Category:   r.Category,
			MinAverage: r.MinAverage,
		})
	}

	if err := userchargers.ValidateRatingFilters(filters.RatingFilters); err != nil {
		return charger.SearchFilters{}, fmt.Errorf("invalid minRatings: %w", err)
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
