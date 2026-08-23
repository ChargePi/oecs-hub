// Package mcp exposes the OECS Hub registry to MCP clients (e.g. LLM agents) as a
// set of read-only tools.
package mcp

import (
	"context"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ChargerSearcher is the subset of charger.Service the search_chargers tool depends on.
type ChargerSearcher interface {
	SearchByFields(ctx context.Context, filters charger.FieldSearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
}

// searchChargersDescription documents search_chargers' filter semantics for the calling
// model: all filters are AND-matched, so each one only narrows the result set further.
const searchChargersDescription = `Search verified EV charger specs in the OECS Hub registry.Supports a free-text query, 
charger type, and manufacturer ID directly,plus a generic 'fields' filter that can match any field of the OECS charger spec 
(https://github.com/ChargePi/oecs) by dot-path, e.g. field "hardware.housing.material" with values ["aluminum"], "hardware.connectors.type" with values ["CCS2_Combo2"], 
or "manufacturer.country" with values ["DE"]. All filters - query, chargerType, manufacturerId, and every entry in fields - are AND-matched: 
each one only narrows the result set further, so add more filters to narrow a search, never to broaden it. Results are paginated.`

// RegisterTools adds every MCP tool the registry exposes to s.
func RegisterTools(s *server.MCPServer, chargers ChargerSearcher) {
	tool := mcp.NewTool("search_chargers",
		mcp.WithDescription(searchChargersDescription),
		mcp.WithInputSchema[SearchChargersInput](),
		mcp.WithOutputSchema[SearchChargersOutput](),
	)

	s.AddTool(tool, newSearchChargersHandler(chargers).Handle)
}
