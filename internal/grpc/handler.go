package grpc

import (
	"context"
	"errors"

	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/graph"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ChargerService is the subset of charger.Service the public handler depends on.
type ChargerService interface {
	Submit(ctx context.Context, raw []byte, submitterIdentityID uuid.UUID, submittedBy, submitterEmail string) (*charger.Charger, error)
	Get(ctx context.Context, id uuid.UUID) (*charger.Charger, error)
	List(ctx context.Context, filters charger.SearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error)
}

// ManufacturerService is the subset of manufacturer.Service the public handler depends on.
type ManufacturerService interface {
	Get(ctx context.Context, id uuid.UUID) (*manufacturer.Manufacturer, error)
	List(ctx context.Context, query, country *string, limit, offset uint32) ([]*manufacturer.Summary, int64, error)
}

// GraphService is the subset of graph.Client the public handler depends on.
type GraphService interface {
	GetManufacturerGraph(ctx context.Context, manufacturerID uuid.UUID) ([]graph.ProductNode, error)
}

type Handler struct {
	registryv1.UnimplementedRegistryServiceServer

	charger      ChargerService
	manufacturer ManufacturerService
	graph        GraphService
}

func NewHandler(charger ChargerService, manufacturer ManufacturerService, graph GraphService) *Handler {
	return &Handler{charger: charger, manufacturer: manufacturer, graph: graph}
}

func (h *Handler) SearchChargers(ctx context.Context, req *registryv1.SearchChargersRequest) (*registryv1.SearchChargersResponse, error) {
	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid page_token")
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), charger.DefaultPageSize, charger.MaxPageSize)

	filters, err := searchChargersFilters(req)
	if err != nil {
		return nil, err
	}

	chargers, total, err := h.charger.List(ctx, filters, limit, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &registryv1.SearchChargersResponse{
		Variants:      chargersToProtoSummaries(chargers),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(chargers), total),
	}, nil
}

func searchChargersFilters(req *registryv1.SearchChargersRequest) (charger.SearchFilters, error) {
	filters := charger.SearchFilters{
		Query:     req.Query,
		Country:   req.Country,
		Protocols: req.GetProtocols(),
		Statuses:  []charger.Status{charger.StatusVerified},
	}

	if req.ManufacturerId != nil {
		id, err := uuid.Parse(req.GetManufacturerId())
		if err != nil {
			return filters, status.Error(codes.InvalidArgument, "invalid manufacturer_id")
		}

		filters.ManufacturerID = &id
	}

	if req.GetChargerType() != registryv1.ChargerType_CHARGER_TYPE_UNSPECIFIED {
		ct := chargerTypeToDomain(req.GetChargerType())
		filters.ChargerType = &ct
	}

	if req.MinPowerKw != nil {
		w := req.GetMinPowerKw() * 1000
		filters.MinPowerWatts = &w
	}

	if req.MaxPowerKw != nil {
		w := req.GetMaxPowerKw() * 1000
		filters.MaxPowerWatts = &w
	}

	for _, ct := range req.GetConnectorTypes() {
		if ct == registryv1.ConnectorType_CONNECTOR_TYPE_UNSPECIFIED {
			continue
		}

		filters.ConnectorTypes = append(filters.ConnectorTypes, connectorTypeToDomain(ct))
	}

	return filters, nil
}

func (h *Handler) GetManufacturers(ctx context.Context, req *registryv1.GetManufacturersRequest) (*registryv1.GetManufacturersResponse, error) {
	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid page_token")
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), manufacturer.DefaultPageSize, manufacturer.MaxPageSize)

	summaries, total, err := h.manufacturer.List(ctx, req.Query, req.Country, limit, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &registryv1.GetManufacturersResponse{
		Manufacturers: manufacturerSummariesToProto(summaries),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(summaries), total),
	}, nil
}

func (h *Handler) GetCharger(ctx context.Context, req *registryv1.GetChargerRequest) (*registryv1.GetChargerResponse, error) {
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	c, err := h.charger.Get(ctx, id)
	if err != nil {
		if errors.Is(err, charger.ErrNotFound) {
			return nil, status.Error(codes.NotFound, "charger not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &registryv1.GetChargerResponse{Variant: chargerToProto(c)}, nil
}

func (h *Handler) GetManufacturer(ctx context.Context, req *registryv1.GetManufacturerRequest) (*registryv1.GetManufacturerResponse, error) {
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	m, err := h.manufacturer.Get(ctx, id)
	if err != nil {
		if errors.Is(err, manufacturer.ErrNotFound) {
			return nil, status.Error(codes.NotFound, "manufacturer not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	productNodes, err := h.graph.GetManufacturerGraph(ctx, id)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	var allIDs []uuid.UUID
	for _, p := range productNodes {
		allIDs = append(allIDs, p.VariantIDs...)
	}

	chargers, err := h.charger.GetMany(ctx, allIDs)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	byID := make(map[uuid.UUID]*charger.Charger, len(chargers))
	for _, c := range chargers {
		byID[c.ID] = c
	}

	products := make([]*registryv1.Product, 0, len(productNodes))

	for _, p := range productNodes {
		variants := make([]*registryv1.ChargerVariantSummary, 0, len(p.VariantIDs))

		for _, vid := range p.VariantIDs {
			if c, ok := byID[vid]; ok {
				variants = append(variants, chargerToProtoSummary(c))
			}
		}

		products = append(products, &registryv1.Product{
			Id:             p.ID,
			ManufacturerId: id.String(),
			Series:         p.Series,
			Variants:       variants,
		})
	}

	return &registryv1.GetManufacturerResponse{
		Manufacturer: manufacturerToProto(m),
		Products:     products,
	}, nil
}

func (h *Handler) SubmitChargerSpec(ctx context.Context, req *registryv1.SubmitChargerSpecRequest) (*registryv1.SubmitChargerSpecResponse, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, err
	}

	if len(req.GetSpec()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "spec is required")
	}

	identityID, err := uuid.Parse(identity.ID)
	if err != nil {
		return nil, status.Error(codes.Internal, "invalid identity id from proxy")
	}

	c, err := h.charger.Submit(ctx, req.GetSpec(), identityID, identity.CompanyName, identity.Email)
	if err != nil {
		if errors.Is(err, charger.ErrInvalidSpec) {
			return nil, status.Error(codes.InvalidArgument, err.Error())
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &registryv1.SubmitChargerSpecResponse{
		Id:     c.ID.String(),
		Status: submissionStatusToProto(c.Status),
	}, nil
}
