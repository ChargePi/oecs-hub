package manufacturer

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("manufacturer.service")

// GraphProjector upserts the read-side Memgraph projection. Implemented by
// internal/graph.Client.
type GraphProjector interface {
	UpsertManufacturer(ctx context.Context, m *Manufacturer) error
}

type Service struct {
	repo  Repository
	cache Cache
	graph GraphProjector
}

func NewService(repo Repository, cache Cache, graph GraphProjector) *Service {
	return &Service{repo: repo, cache: cache, graph: graph}
}

// Get retrieves a manufacturer by ID, cache-aside.
func (s *Service) Get(ctx context.Context, id uuid.UUID) (*Manufacturer, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.Get", trace.WithAttributes(idAttr(id)))
	defer span.End()

	cached, err := s.cache.Get(ctx, id)
	if err == nil {
		return cached, nil
	}

	if !errors.Is(err, ErrNotFound) {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get manufacturer from cache: %w", err)
	}

	m, err := s.repo.Get(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get manufacturer: %w", err)
	}

	_ = s.cache.Set(ctx, m)

	return m, nil
}

// List returns manufacturers matching query/country, paginated, with product/variant counts.
func (s *Service) List(ctx context.Context, query, country *string, limit, offset uint32) ([]*Summary, int64, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.List")
	defer span.End()

	summaries, total, err := s.repo.List(ctx, query, country, clampPageSize(limit), offset)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, fmt.Errorf("list manufacturers: %w", err)
	}

	return summaries, total, nil
}

// Create creates (or idempotently returns) the manufacturer described by m, used by the
// admin CreateManufacturer RPC. Also upserts the corresponding Memgraph node.
func (s *Service) Create(ctx context.Context, m *Manufacturer) (*Manufacturer, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.Create", trace.WithAttributes(nameAttr(m.Name)))
	defer span.End()

	err := s.repo.FindOrCreate(ctx, m)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("create manufacturer: %w", err)
	}

	err = s.graph.UpsertManufacturer(ctx, m)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("upsert manufacturer graph node: %w", err)
	}

	return m, nil
}

// ResolveID resolves (name, country) to a manufacturer ID, creating the manufacturer -
// in Postgres and in the graph projection - if it doesn't already exist. Used by
// charger.Service when a submitted spec is verified.
func (s *Service) ResolveID(ctx context.Context, name, country string) (uuid.UUID, error) {
	m, err := s.Create(ctx, &Manufacturer{Name: name, Country: country})
	if err != nil {
		return uuid.Nil, err
	}

	return m.ID, nil
}

func clampPageSize(limit uint32) uint32 {
	if limit == 0 {
		return DefaultPageSize
	}

	if limit > MaxPageSize {
		return MaxPageSize
	}

	return limit
}
