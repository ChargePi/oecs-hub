package graph

import (
	"context"
	"fmt"
	"strings"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// ProductID deterministically derives a (:Product) node ID from a manufacturer ID and
// series so repeated UpsertVariant calls for the same manufacturer+series MERGE onto
// the same node instead of creating duplicates.
func ProductID(manufacturerID uuid.UUID, series string) string {
	s := slugify(series)
	if s == "" {
		s = "_unspecified"
	}

	return manufacturerID.String() + ":" + s
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))

	var b strings.Builder

	prevDash := false

	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)

			prevDash = false
		default:
			if !prevDash && b.Len() > 0 {
				b.WriteRune('-')

				prevDash = true
			}
		}
	}

	return strings.TrimRight(b.String(), "-")
}

// UpsertVariant merges the (:Manufacturer)-[:MAKES]->(:Product)-[:HAS_VARIANT]->(:Variant)
// path for a newly-verified charger record.
func (c *Client) UpsertVariant(ctx context.Context, manufacturerID uuid.UUID, ch *charger.Charger) error {
	ctx, span := tracer.Start(ctx, "graph.UpsertVariant", trace.WithAttributes(
		attribute.String("manufacturer.id", manufacturerID.String()),
		attribute.String("charger.id", ch.ID.String()),
	))
	defer span.End()

	session := c.writeSession(ctx)
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		return tx.Run(ctx, `
			MERGE (m:Manufacturer {id: $manufacturerId})
			MERGE (p:Product {id: $productId})
			ON CREATE SET p.manufacturer_id = $manufacturerId, p.series = $series
			MERGE (m)-[:MAKES]->(p)
			MERGE (v:Variant {id: $variantId})
			SET v.model_name = $modelName, v.charger_type = $chargerType, v.status = $status
			MERGE (p)-[:HAS_VARIANT]->(v)
		`, map[string]any{
			"manufacturerId": manufacturerID.String(),
			"productId":      ProductID(manufacturerID, ch.Series),
			"series":         ch.Series,
			"variantId":      ch.ID.String(),
			"modelName":      ch.ModelName,
			"chargerType":    ch.ChargerType,
			"status":         string(ch.Status),
		})
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("upsert variant node: %w", err)
	}

	return nil
}

// RemoveVariant deletes the (:Variant) node for variantID, and its (:Product) parent
// too if that was its last remaining variant.
func (c *Client) RemoveVariant(ctx context.Context, variantID uuid.UUID) error {
	ctx, span := tracer.Start(ctx, "graph.RemoveVariant", trace.WithAttributes(attribute.String("charger.id", variantID.String())))
	defer span.End()

	session := c.writeSession(ctx)
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		return tx.Run(ctx, `
			MATCH (v:Variant {id: $variantId})
			OPTIONAL MATCH (p:Product)-[:HAS_VARIANT]->(v)
			DETACH DELETE v
			WITH p
			WHERE p IS NOT NULL AND NOT (p)-[:HAS_VARIANT]->(:Variant)
			DETACH DELETE p
		`, map[string]any{"variantId": variantID.String()})
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("remove variant node: %w", err)
	}

	return nil
}
