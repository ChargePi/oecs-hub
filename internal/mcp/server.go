// Package mcp exposes the OECS Hub registry to MCP clients (e.g. LLM agents) as a
// set of read-only tools.
package mcp

import (
	"context"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ChargerService is the subset of charger.Service the tools in this package
// depend on.
type ChargerService interface {
	SearchByFields(ctx context.Context, filters charger.FieldSearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error)
}

// searchChargersDescription documents search_chargers' filter semantics for the calling
// model: all filters are AND-matched, so each one only narrows the result set further.
const searchChargersDescription = `Search verified EV charger specs in the OECS Hub registry.Supports a free-text query, 
charger type, and manufacturer ID directly,plus a generic 'fields' filter that can match any field of the OECS charger spec 
(https://github.com/ChargePi/oecs) by dot-path, e.g. field "hardware.housing.material" with values ["aluminum"], "hardware.connectors.type" with values ["CCS2_Combo2"], 
or "manufacturer.country" with values ["DE"]. All filters - query, chargerType, manufacturerId, and every entry in fields - are AND-matched: 
each one only narrows the result set further, so add more filters to narrow a search, never to broaden it. Results are paginated.`

// getChargersDescription documents get_chargers' purpose for the calling model: an
// exact-ID batch fetch, never a name/text lookup - callers must resolve a name to an
// id via search_chargers first.
const getChargersDescription = `Fetch the exact, authoritative record for one or more verified EV chargers by id.
Unlike search_chargers, this is not a text/filter search - every id must already be known
(e.g. from a prior search_chargers call). A missing or unverified id is silently omitted
from the result rather than failing the whole call.`

// RegisterTools adds every MCP tool the registry exposes to s.
func RegisterTools(s *server.MCPServer, chargers ChargerService) {
	searchTool := mcp.NewTool("search_chargers",
		mcp.WithDescription(searchChargersDescription),
		mcp.WithInputSchema[SearchChargersInput](),
		mcp.WithOutputSchema[SearchChargersOutput](),
	)
	s.AddTool(searchTool, newSearchChargersHandler(chargers).Handle)

	getTool := mcp.NewTool("get_chargers",
		mcp.WithDescription(getChargersDescription),
		mcp.WithInputSchema[GetChargersInput](),
		mcp.WithOutputSchema[GetChargersOutput](),
	)
	s.AddTool(getTool, newGetChargersHandler(chargers).Handle)
}
