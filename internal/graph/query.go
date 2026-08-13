package graph

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// ProductNode is a manufacturer+series grouping as stored in the graph. It carries
// only identity/structure - callers hydrate full variant detail from Postgres via the
// VariantIDs, keeping the graph a thin relationship index rather than a second copy of
// searchable variant fields.
type ProductNode struct {
	ID         string
	Series     string
	VariantIDs []uuid.UUID
}

// GetManufacturerGraph returns the products (and their variant IDs) reachable from
// manufacturerID, in one traversal.
func (c *Client) GetManufacturerGraph(ctx context.Context, manufacturerID uuid.UUID) ([]ProductNode, error) {
	ctx, span := tracer.Start(ctx, "graph.GetManufacturerGraph", trace.WithAttributes(attribute.String("manufacturer.id", manufacturerID.String())))
	defer span.End()

	session := c.readSession(ctx)
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		records, err := tx.Run(ctx, `
			MATCH (m:Manufacturer {id: $manufacturerId})-[:MAKES]->(p:Product)
			OPTIONAL MATCH (p)-[:HAS_VARIANT]->(v:Variant)
			RETURN p.id AS product_id, p.series AS series, collect(v.id) AS variant_ids
			ORDER BY series
		`, map[string]any{"manufacturerId": manufacturerID.String()})
		if err != nil {
			return nil, err
		}

		var products []ProductNode

		for records.Next(ctx) {
			rec := records.Record()

			productID, _ := rec.Get("product_id")
			series, _ := rec.Get("series")
			rawVariantIDs, _ := rec.Get("variant_ids")

			node := ProductNode{
				ID:     asString(productID),
				Series: asString(series),
			}

			for _, raw := range rawVariantIDs.([]any) {
				id, err := uuid.Parse(asString(raw))
				if err != nil {
					continue
				}

				node.VariantIDs = append(node.VariantIDs, id)
			}

			products = append(products, node)
		}

		if err := records.Err(); err != nil {
			return nil, err
		}

		return products, nil
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("query manufacturer graph: %w", err)
	}

	return result.([]ProductNode), nil
}

func asString(v any) string {
	s, _ := v.(string)

	return s
}
