package graph

import (
	"context"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// UpsertManufacturer creates or updates the (:Manufacturer) node for m.
func (c *Client) UpsertManufacturer(ctx context.Context, m *manufacturer.Manufacturer) error {
	ctx, span := tracer.Start(ctx, "graph.UpsertManufacturer", trace.WithAttributes(attribute.String("manufacturer.id", m.ID.String())))
	defer span.End()

	session := c.writeSession(ctx)
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		return tx.Run(ctx, `
			MERGE (m:Manufacturer {id: $id})
			SET m.name = $name, m.country = $country
		`, map[string]any{
			"id":      m.ID.String(),
			"name":    m.Name,
			"country": m.Country,
		})
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("upsert manufacturer node: %w", err)
	}

	return nil
}
