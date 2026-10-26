package manufacturer

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
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
	index SemanticIndex
}

// NewService takes a nil index when semantic search is disabled.
func NewService(repo Repository, cache Cache, graph GraphProjector, index SemanticIndex) *Service {
	return &Service{repo: repo, cache: cache, graph: graph, index: index}
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

	filters := ListFilters{Query: query, Country: country, RankedIDs: s.rankSemantically(ctx, query)}

	summaries, total, err := s.repo.List(ctx, filters, clampPageSize(limit), offset)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, fmt.Errorf("list manufacturers: %w", err)
	}

	return summaries, total, nil
}

// Create creates the admin-authored manufacturer described by m and its Memgraph node.
// Returns ErrAlreadyExists if (name, country) is taken.
func (s *Service) Create(ctx context.Context, m *Manufacturer) (*Manufacturer, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.Create", trace.WithAttributes(nameAttr(m.Name)))
	defer span.End()

	err := s.repo.Create(ctx, m)
	switch {
	case errors.Is(err, ErrAlreadyExists):
		return nil, fmt.Errorf("create manufacturer: %w", err)
	case err != nil:
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

	_ = s.cache.Set(ctx, m)

	s.indexManufacturer(ctx, m)

	return m, nil
}

// SetOwner links id to ownerIdentityID, replacing any current owner. Returns
// ErrNotFound or ErrOwnershipConflict - see Repository.SetOwner.
func (s *Service) SetOwner(ctx context.Context, id, ownerIdentityID uuid.UUID) (*Manufacturer, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.SetOwner", trace.WithAttributes(idAttr(id)))
	defer span.End()

	m, err := s.repo.SetOwner(ctx, id, ownerIdentityID)
	switch {
	case errors.Is(err, ErrNotFound), errors.Is(err, ErrOwnershipConflict):
		return nil, fmt.Errorf("set manufacturer owner: %w", err)
	case err != nil:
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("set manufacturer owner: %w", err)
	}

	_ = s.cache.Delete(ctx, id)

	return m, nil
}

// ResolveIDForIdentity resolves (name, country) to a manufacturer ID owned by
// ownerIdentityID, creating or claiming the row - in Postgres and in the graph
// projection - as needed. Used by charger.Service when a spec submitted by an
// authenticated manufacturer identity is verified. Returns ErrOwnershipConflict if
// (name, country) is already owned by a different identity.
func (s *Service) ResolveIDForIdentity(ctx context.Context, ownerIdentityID uuid.UUID, name, country string) (uuid.UUID, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.ResolveIDForIdentity", trace.WithAttributes(nameAttr(name)))
	defer span.End()

	m := &Manufacturer{Name: name, Country: country}

	err := s.repo.FindOrCreateForIdentity(ctx, ownerIdentityID, m)
	switch {
	case errors.Is(err, ErrOwnershipConflict):
		return uuid.Nil, err
	case err != nil:
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return uuid.Nil, fmt.Errorf("find or create manufacturer for identity: %w", err)
	}

	if err := s.graph.UpsertManufacturer(ctx, m); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return uuid.Nil, fmt.Errorf("upsert manufacturer graph node: %w", err)
	}

	s.indexManufacturer(ctx, m)

	return m.ID, nil
}

// RefreshCatalog is called by charger.Service when a manufacturer's verified chargers change.
func (s *Service) RefreshCatalog(ctx context.Context, id uuid.UUID) error {
	ctx, span := tracer.Start(ctx, "manufacturer.RefreshCatalog", trace.WithAttributes(idAttr(id)))
	defer span.End()

	m, err := s.repo.RefreshCatalog(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("refresh manufacturer catalog: %w", err)
	}

	_ = s.cache.Delete(ctx, id)

	s.indexManufacturer(ctx, m)

	return nil
}

// Reindex counts and skips manufacturers that fail to index.
func (s *Service) Reindex(ctx context.Context) (ReindexResult, error) {
	ctx, span := tracer.Start(ctx, "manufacturer.Reindex")
	defer span.End()

	var result ReindexResult

	if s.index == nil {
		return result, ErrSemanticSearchDisabled
	}

	for offset := uint32(0); ; offset += MaxPageSize {
		summaries, _, err := s.repo.List(ctx, ListFilters{}, MaxPageSize, offset)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())

			return result, fmt.Errorf("list manufacturers: %w", err)
		}

		for _, summary := range summaries {
			m := &summary.Manufacturer

			err := s.index.Upsert(ctx, m)
			if err != nil {
				zap.L().Warn("failed to index manufacturer", zap.Stringer("id", m.ID), zap.Error(err))

				result.Failed++

				continue
			}

			result.Indexed++
		}

		if len(summaries) < MaxPageSize {
			return result, nil
		}
	}
}

func (s *Service) rankSemantically(ctx context.Context, query *string) []uuid.UUID {
	if s.index == nil || query == nil || *query == "" {
		return nil
	}

	ids, err := s.index.Search(ctx, *query)
	if err != nil {
		zap.L().Warn("semantic search failed, falling back to name search", zap.Error(err))

		return nil
	}

	return ids
}

func (s *Service) indexManufacturer(ctx context.Context, m *Manufacturer) {
	if s.index == nil {
		return
	}

	err := s.index.Upsert(ctx, m)
	if err != nil {
		zap.L().Warn("failed to index manufacturer", zap.Stringer("id", m.ID), zap.Error(err))
	}
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
