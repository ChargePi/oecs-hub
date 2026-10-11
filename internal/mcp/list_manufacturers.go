package mcp

import (
	"context"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/mark3labs/mcp-go/mcp"
)

// ManufacturerService is the subset of manufacturer.Service the
// list_manufacturers tool depends on.
type ManufacturerService interface {
	List(ctx context.Context, query, country *string, limit, offset uint32) ([]*manufacturer.Summary, int64, error)
}

type ListManufacturersInput struct {
	Query     string `json:"query,omitempty" jsonschema:"optional free-text search: a manufacturer name, or a natural-language description of what the manufacturer makes (e.g. \"DC fast chargers with CCS2 and OCPP 2.0.1\"); results are ordered by relevance"`
	Country   string `json:"country,omitempty" jsonschema:"optional ISO 3166-1 alpha-2 country code filter"`
	PageSize  int    `json:"pageSize,omitempty" jsonschema:"max results to return (default 50, max 200)"`
	PageToken string `json:"pageToken,omitempty" jsonschema:"opaque pagination cursor from a previous response's nextPageToken"`
}

type ManufacturerSummaryOutput struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Country string `json:"country,omitempty"`
}

type ListManufacturersOutput struct {
	Manufacturers []ManufacturerSummaryOutput `json:"manufacturers"`
	TotalSize     int64                       `json:"totalSize"`
	NextPageToken string                      `json:"nextPageToken,omitempty"`
}

type listManufacturersHandler struct {
	manufacturers ManufacturerService
}

func newListManufacturersHandler(manufacturers ManufacturerService) *listManufacturersHandler {
	return &listManufacturersHandler{manufacturers: manufacturers}
}

func (h *listManufacturersHandler) Handle(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var in ListManufacturersInput
	if err := req.BindArguments(&in); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to bind arguments: %v", err)), nil
	}

	var query, country *string
	if in.Query != "" {
		query = &in.Query
	}
	if in.Country != "" {
		country = &in.Country
	}

	offset, err := pagination.DecodeOffset(in.PageToken)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid pageToken: %v", err)), nil
	}

	limit := pagination.ClampPageSize(in.PageSize, manufacturer.DefaultPageSize, manufacturer.MaxPageSize)

	results, total, err := h.manufacturers.List(ctx, query, country, limit, offset)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	out := ListManufacturersOutput{
		Manufacturers: make([]ManufacturerSummaryOutput, 0, len(results)),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(results), total),
	}
	for _, s := range results {
		out.Manufacturers = append(out.Manufacturers, ManufacturerSummaryOutput{
			ID:      s.Manufacturer.ID.String(),
			Name:    s.Manufacturer.Name,
			Country: s.Manufacturer.Country,
		})
	}

	return &mcp.CallToolResult{Content: []mcp.Content{}, StructuredContent: out}, nil
}
