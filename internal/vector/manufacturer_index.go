package vector

import (
	"context"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/cloudwego/eino/components/embedding"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/codes"
)

// ManufacturerIndex implements manufacturer.SemanticIndex.
type ManufacturerIndex struct {
	*index
}

func NewManufacturerIndex(cfg Config, embedder embedding.Embedder) (*ManufacturerIndex, error) {
	idx, err := newIndex(cfg, embedder)
	if err != nil {
		return nil, err
	}

	return &ManufacturerIndex{index: idx}, nil
}

func (i *ManufacturerIndex) Upsert(ctx context.Context, m *manufacturer.Manufacturer) error {
	ctx, span := tracer.Start(ctx, "vector.ManufacturerIndex.Upsert")
	defer span.End()

	err := i.upsertManufacturer(ctx, m)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return err
	}

	return nil
}

func (i *ManufacturerIndex) upsertManufacturer(ctx context.Context, m *manufacturer.Manufacturer) error {
	document, err := manufacturerDocument(m)
	if err != nil {
		return fmt.Errorf("build manufacturer document: %w", err)
	}

	err = i.upsert(ctx, m.ID, document, map[string]any{
		"name":    m.Name,
		"country": m.Country,
	})
	if err != nil {
		return fmt.Errorf("upsert manufacturer: %w", err)
	}

	return nil
}

func (i *ManufacturerIndex) Search(ctx context.Context, query string) ([]uuid.UUID, error) {
	ctx, span := tracer.Start(ctx, "vector.ManufacturerIndex.Search")
	defer span.End()

	ids, err := i.search(ctx, query)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("search manufacturers: %w", err)
	}

	return ids, nil
}
