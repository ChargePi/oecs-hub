package charger

import (
	"context"
	"errors"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/oecsspec"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("charger.service")

// ManufacturerResolver resolves a manufacturer name/country to an ID, creating the
// manufacturer if it doesn't already exist. Implemented by manufacturer.Service.
type ManufacturerResolver interface {
	ResolveID(ctx context.Context, name, country string) (uuid.UUID, error)
}

// GraphProjector upserts/removes the read-side Memgraph projection. Implemented by
// internal/graph.Client.
type GraphProjector interface {
	UpsertVariant(ctx context.Context, manufacturerID uuid.UUID, c *Charger) error
	RemoveVariant(ctx context.Context, variantID uuid.UUID) error
}

type Service struct {
	repo         Repository
	cache        Cache
	validator    *oecsspec.Validator
	manufacturer ManufacturerResolver
	graph        GraphProjector
}

func NewService(repo Repository, cache Cache, validator *oecsspec.Validator, manufacturer ManufacturerResolver, graph GraphProjector) *Service {
	return &Service{repo: repo, cache: cache, validator: validator, manufacturer: manufacturer, graph: graph}
}

// Submit validates raw against the OECS schema, extracts search fields, and inserts it
// with status StatusSubmitted. Returns an error wrapping ErrInvalidSpec if validation
// fails.
func (s *Service) Submit(ctx context.Context, raw []byte, submittedBy string) (*Charger, error) {
	ctx, span := tracer.Start(ctx, "charger.Submit")
	defer span.End()

	spec, err := s.validator.Validate(raw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("%w: %w", ErrInvalidSpec, err)
	}

	fields := extract(spec)
	c := &Charger{
		ManufacturerName:    spec.Manufacturer.Name,
		ManufacturerCountry: spec.Manufacturer.Country,
		Series:              spec.Model.Series,
		ModelName:           spec.Model.Name,
		PartNumber:          spec.Model.PartNumber,
		ChargerType:         spec.Model.Type,
		ModelStatus:         spec.Model.Status,
		ConnectorTypes:      fields.connectorTypes,
		Protocols:           fields.protocols,
		MinPowerWatts:       fields.minPowerWatts,
		MaxPowerWatts:       fields.maxPowerWatts,
		ProductImageURL:     spec.Model.ProductImageURL,
		SchemaVersion:       spec.Version,
		Spec:                raw,
		Status:              StatusSubmitted,
		SubmittedBy:         submittedBy,
	}

	if err := s.repo.Create(ctx, c); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("create charger: %w", err)
	}

	return c, nil
}

// Get retrieves a verified charger by ID, cache-aside.
func (s *Service) Get(ctx context.Context, id uuid.UUID) (*Charger, error) {
	ctx, span := tracer.Start(ctx, "charger.Get", trace.WithAttributes(idAttr(id)))
	defer span.End()

	cached, err := s.cache.Get(ctx, id)
	if err == nil {
		return cached, nil
	}

	if !errors.Is(err, ErrNotFound) {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get charger from cache: %w", err)
	}

	c, err := s.repo.Get(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get charger: %w", err)
	}

	_ = s.cache.Set(ctx, c)

	return c, nil
}

// GetForReview retrieves a charger by ID regardless of status, for admin use.
func (s *Service) GetForReview(ctx context.Context, id uuid.UUID) (*Charger, error) {
	ctx, span := tracer.Start(ctx, "charger.GetForReview", trace.WithAttributes(idAttr(id)))
	defer span.End()

	c, err := s.repo.GetForReview(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get charger for review: %w", err)
	}

	return c, nil
}

// List returns chargers matching filters, paginated.
func (s *Service) List(ctx context.Context, filters SearchFilters, limit, offset uint32) ([]*Charger, int64, error) {
	ctx, span := tracer.Start(ctx, "charger.List")
	defer span.End()

	chargers, total, err := s.repo.List(ctx, filters, clampPageSize(limit), offset)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, 0, fmt.Errorf("list chargers: %w", err)
	}

	return chargers, total, nil
}

// GetMany returns the verified chargers among ids, used to hydrate full variant detail
// for a graph traversal (see internal/graph.GetManufacturerGraph, which only returns
// IDs). Missing/unverified IDs are silently omitted.
func (s *Service) GetMany(ctx context.Context, ids []uuid.UUID) ([]*Charger, error) {
	ctx, span := tracer.Start(ctx, "charger.GetMany")
	defer span.End()

	chargers, err := s.repo.ListByIDs(ctx, ids)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("list chargers by ids: %w", err)
	}

	return chargers, nil
}

// ChangeStatus applies an admin review decision. Verifying resolves (creating if
// necessary) the manufacturer the spec references and upserts the Memgraph
// projection; rejecting a previously-verified record removes it from the projection.
// Either way the cached copy is evicted so the next Get reflects the new status.
func (s *Service) ChangeStatus(ctx context.Context, id uuid.UUID, status Status) (*Charger, error) {
	ctx, span := tracer.Start(ctx, "charger.ChangeStatus", trace.WithAttributes(idAttr(id), statusAttr(status)))
	defer span.End()

	existing, err := s.repo.GetForReview(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get charger for review: %w", err)
	}

	var manufacturerID *uuid.UUID

	if status == StatusVerified {
		mID, err := s.manufacturer.ResolveID(ctx, existing.ManufacturerName, existing.ManufacturerCountry)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())

			return nil, fmt.Errorf("resolve manufacturer: %w", err)
		}

		manufacturerID = &mID
	}

	updated, err := s.repo.UpdateStatus(ctx, id, status, manufacturerID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("update charger status: %w", err)
	}

	_ = s.cache.Delete(ctx, id)

	switch status {
	case StatusVerified:
		err := s.graph.UpsertVariant(ctx, *manufacturerID, updated)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())

			return nil, fmt.Errorf("upsert variant graph node: %w", err)
		}
	case StatusRejected:
		if existing.Status == StatusVerified {
			err := s.graph.RemoveVariant(ctx, id)
			if err != nil {
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())

				return nil, fmt.Errorf("remove variant graph node: %w", err)
			}
		}
	case StatusSubmitted:
		// Not a valid ChangeStatus target; handlers reject this before calling in.
	}

	return updated, nil
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
