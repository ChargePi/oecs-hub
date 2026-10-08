// Package mcp exposes the OECS Hub registry to MCP clients (e.g. LLM agents): read-only
// catalogue tools, plus user tools that act for the signed-in caller (see user_tools.go).
package mcp

import (
	"context"
	_ "embed"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ChargerService is the subset of charger.Service the tools in this package
// depend on.
type ChargerService interface {
	Search(ctx context.Context, filters charger.SearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error)
}

// searchChargersDescription documents search_chargers' filter semantics for the calling
// model: all filters are AND-matched, so each one only narrows the result set further.
//
//go:embed prompts/search_chargers_description.tmpl
var searchChargersDescription string

// getChargersDescription documents get_chargers' purpose for the calling model: an
// exact-ID batch fetch, never a name/text lookup - callers must resolve a name to an
// id via search_chargers first.
const getChargersDescription = `Fetch the exact, authoritative record for one or more verified EV chargers by id.
Unlike search_chargers, this is not a text/filter search - every id must already be known
(e.g. from a prior search_chargers call). A missing or unverified id is silently omitted
from the result rather than failing the whole call.`

// RegisterTools adds every MCP tool the registry exposes to s. manufacturers is a
// separate parameter from chargers since they're backed by distinct services
// (manufacturer.Service, not charger.Service) - mirroring how cmd/app/main.go already
// keeps chargerSvc/manufacturerSvc as separate instances.
func RegisterTools(s *server.MCPServer, chargers ChargerService, manufacturers ManufacturerService) {
	searchTool := mcp.NewTool("search_chargers",
		mcp.WithDescription(searchChargersDescription),
		mcp.WithInputSchema[SearchChargersInput](),
		mcp.WithOutputSchema[SearchChargersOutput](),
		readOnlyAnnotations(),
	)
	s.AddTool(searchTool, newSearchChargersHandler(chargers).Handle)

	getTool := mcp.NewTool("get_chargers",
		mcp.WithDescription(getChargersDescription),
		mcp.WithInputSchema[GetChargersInput](),
		mcp.WithOutputSchema[GetChargersOutput](),
		readOnlyAnnotations(),
	)
	s.AddTool(getTool, newGetChargersHandler(chargers).Handle)

	listManufacturersTool := mcp.NewTool("list_manufacturers",
		mcp.WithDescription(listManufacturersDescription),
		mcp.WithInputSchema[ListManufacturersInput](),
		mcp.WithOutputSchema[ListManufacturersOutput](),
		readOnlyAnnotations(),
	)
	s.AddTool(listManufacturersTool, newListManufacturersHandler(manufacturers).Handle)
}
