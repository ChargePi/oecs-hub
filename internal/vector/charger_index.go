package vector

import (
	"context"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/cloudwego/eino/components/embedding"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
)

var tracer = otel.Tracer("vector.index")

// ChargerIndex implements charger.SemanticIndex.
type ChargerIndex struct {
	*index
}

func NewChargerIndex(cfg Config, embedder embedding.Embedder) (*ChargerIndex, error) {
	idx, err := newIndex(cfg, embedder)
	if err != nil {
		return nil, err
	}

	return &ChargerIndex{index: idx}, nil
}

func (i *ChargerIndex) Upsert(ctx context.Context, c *charger.Charger) error {
	ctx, span := tracer.Start(ctx, "vector.ChargerIndex.Upsert")
	defer span.End()

	err := i.upsertCharger(ctx, c)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return err
	}

	return nil
}

func (i *ChargerIndex) upsertCharger(ctx context.Context, c *charger.Charger) error {
	document, err := chargerDocument(c.Spec)
	if err != nil {
		return fmt.Errorf("build charger document: %w", err)
	}

	err = i.upsert(ctx, c.ID, document, map[string]any{
		"manufacturer": c.ManufacturerName,
		"series":       c.Series,
		"model":        c.ModelName,
		"type":         c.ChargerType,
	})
	if err != nil {
		return fmt.Errorf("upsert charger: %w", err)
	}

	return nil
}

func (i *ChargerIndex) Remove(ctx context.Context, id uuid.UUID) error {
	ctx, span := tracer.Start(ctx, "vector.ChargerIndex.Remove")
	defer span.End()

	err := i.remove(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("remove charger: %w", err)
	}

	return nil
}

func (i *ChargerIndex) Search(ctx context.Context, query string) ([]uuid.UUID, error) {
	ctx, span := tracer.Start(ctx, "vector.ChargerIndex.Search")
	defer span.End()

	ids, err := i.search(ctx, query)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("search chargers: %w", err)
	}

	return ids, nil
}
