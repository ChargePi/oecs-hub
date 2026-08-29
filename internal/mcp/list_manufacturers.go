package mcp

import (
	"context"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/mark3labs/mcp-go/mcp"
)

// ManufacturerLister is the subset of manufacturer.Service the
// list_manufacturers tool depends on.
type ManufacturerLister interface {
	List(ctx context.Context, query, country *string, limit, offset uint32) ([]*manufacturer.Summary, int64, error)
}

type ListManufacturersInput struct {
	Query    string `json:"query,omitempty" jsonschema:"optional free-text filter on manufacturer name"`
	Country  string `json:"country,omitempty" jsonschema:"optional ISO 3166-1 alpha-2 country code filter"`
	PageSize int    `json:"pageSize,omitempty" jsonschema:"max results to return (default 50, max 200)"`
}

type ManufacturerSummaryOutput struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Country string `json:"country,omitempty"`
}

type ListManufacturersOutput struct {
	Manufacturers []ManufacturerSummaryOutput `json:"manufacturers"`
	TotalSize     int64                       `json:"totalSize"`
}

// listManufacturersDescription documents this tool's purpose for the calling model: a
// real listing of manufacturers actually in the registry, so a caller can reference an
// actual manufacturer name instead of inventing one.
const listManufacturersDescription = `List manufacturers actually present in the OECS Hub registry, optionally filtered by a
free-text name query and/or ISO 3166-1 alpha-2 country code. Use this before referencing
any manufacturer by name (e.g. to ask a user which manufacturer they prefer) - never guess
or invent a manufacturer name from general knowledge, since only manufacturers returned
here actually have chargers in this registry.`

type listManufacturersHandler struct {
	manufacturers ManufacturerLister
}

func newListManufacturersHandler(manufacturers ManufacturerLister) *listManufacturersHandler {
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

	results, total, err := h.manufacturers.List(ctx, query, country, uint32(in.PageSize), 0)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	out := ListManufacturersOutput{
		Manufacturers: make([]ManufacturerSummaryOutput, 0, len(results)),
		TotalSize:     total,
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
