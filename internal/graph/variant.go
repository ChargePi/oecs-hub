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

const upsertVariantQuery = `
	MERGE (m:Manufacturer {id: $manufacturerId})
	MERGE (p:Product {id: $productId})
	ON CREATE SET p.manufacturer_id = $manufacturerId, p.series = $series
	MERGE (m)-[:MAKES]->(p)
	MERGE (v:Variant {id: $variantId})
	SET v.model_name = $modelName, v.charger_type = $chargerType, v.status = $status
	MERGE (p)-[:HAS_VARIANT]->(v)
`

// detachVariantQuery unlinks the variant from its product, deleting the product if it
// has no variants left.
const detachVariantQuery = `
	MATCH (p:Product)-[r:HAS_VARIANT]->(:Variant {id: $variantId})
	DELETE r
	WITH p
	OPTIONAL MATCH (p)-[:HAS_VARIANT]->(other:Variant)
	WITH p, count(other) AS remaining
	WHERE remaining = 0
	DETACH DELETE p
`

func upsertVariantParams(manufacturerID uuid.UUID, ch *charger.Charger) map[string]any {
	return map[string]any{
		"manufacturerId": manufacturerID.String(),
		"productId":      ProductID(manufacturerID, ch.Series),
		"series":         ch.Series,
		"variantId":      ch.ID.String(),
		"modelName":      ch.ModelName,
		"chargerType":    ch.ChargerType,
		"status":         string(ch.Status),
	}
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
		return tx.Run(ctx, upsertVariantQuery, upsertVariantParams(manufacturerID, ch))
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("upsert variant node: %w", err)
	}

	return nil
}

// MoveVariant re-parents the (:Variant) for ch under manufacturerID's (:Product) for its
// series, deleting the old (:Product) if it was left without variants.
func (c *Client) MoveVariant(ctx context.Context, manufacturerID uuid.UUID, ch *charger.Charger) error {
	ctx, span := tracer.Start(ctx, "graph.MoveVariant", trace.WithAttributes(
		attribute.String("manufacturer.id", manufacturerID.String()),
		attribute.String("charger.id", ch.ID.String()),
	))
	defer span.End()

	session := c.writeSession(ctx)
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		detached, err := tx.Run(ctx, detachVariantQuery, map[string]any{"variantId": ch.ID.String()})
		if err != nil {
			return nil, fmt.Errorf("detach variant: %w", err)
		}

		if _, err := detached.Consume(ctx); err != nil {
			return nil, fmt.Errorf("detach variant: %w", err)
		}

		return tx.Run(ctx, upsertVariantQuery, upsertVariantParams(manufacturerID, ch))
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("move variant node: %w", err)
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
		params := map[string]any{"variantId": variantID.String()}

		detached, err := tx.Run(ctx, detachVariantQuery, params)
		if err != nil {
			return nil, fmt.Errorf("detach variant: %w", err)
		}

		if _, err := detached.Consume(ctx); err != nil {
			return nil, fmt.Errorf("detach variant: %w", err)
		}

		return tx.Run(ctx, `MATCH (v:Variant {id: $variantId}) DETACH DELETE v`, params)
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("remove variant node: %w", err)
	}

	return nil
}
