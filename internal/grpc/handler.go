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
	Search(ctx context.Context, filters charger.SearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error)
	SubmitRating(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []charger.RatingInput) (charger.RatingsSummary, error)
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

	chargers, total, err := h.charger.Search(ctx, filters, limit, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &registryv1.SearchChargersResponse{
		Variants:      chargersToProtoSummaries(chargers),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(chargers), total),
	}, nil
}

// allowedSearchFieldPaths are the OECS spec dot-paths the public SearchChargers RPC may
// filter on. Deliberately restrictive: field_filters values are client-supplied and
// interpolated into a Postgres jsonpath query (see charger_field_filter.go), so anything
// not listed here is rejected rather than passed through. This is the sidebar's filter
// manifest on the frontend (web/src/features/explore-chargers/filter-manifest.ts) - keep
// the two in sync.
var allowedSearchFieldPaths = map[string]struct{}{
	"model.type":                                               {},
	"model.status":                                             {},
	"hardware.connectors.type":                                 {},
	"hardware.connectors.bidirectional":                        {},
	"hardware.connectors.isoPlugAndCharge":                     {},
	"hardware.connectors.cable.attached":                       {},
	"hardware.electrical.output.simultaneousChargingSupported": {},
	"hardware.electrical.output.dynamicPowerSharing":           {},
	"manufacturer.country":                                     {},
	"hardware.housing.formFactor":                              {},
	"hardware.housing.material":                                {},
	"hardware.housing.coolingMethod":                           {},
	"hardware.housing.ingressProtection":                       {},
	"hardware.electrical.input.phases":                         {},
	"hardware.electrical.input.connectionType":                 {},
	"hardware.connectivity.interfaces":                         {},
	"hardware.connectivity.cellular.generations":               {},
	"software.smartCharging.features":                          {},
	"software.offlineChargingSupported":                        {},
	"software.protocols.name":                                  {},
	"hardware.userInterface.display.type":                      {},
	"hardware.userInterface.authenticationMethods":             {},
	"payment.acceptedMethods":                                  {},
	"payment.adHocPaymentSupported":                            {},
	"hardware.certifications.type":                             {},
	"pricing.pricingModel":                                     {},
}

func searchChargersFilters(req *registryv1.SearchChargersRequest) (charger.SearchFilters, error) {
	filters := charger.SearchFilters{
		Query:    req.Query,
		Statuses: []charger.Status{charger.StatusVerified},
	}

	if req.ManufacturerId != nil {
		id, err := uuid.Parse(req.GetManufacturerId())
		if err != nil {
			return filters, status.Error(codes.InvalidArgument, "invalid manufacturer_id")
		}

		filters.ManufacturerID = &id
	}

	if req.MinPowerKw != nil {
		w := req.GetMinPowerKw() * 1000
		filters.MinPowerWatts = &w
	}

	if req.MaxPowerKw != nil {
		w := req.GetMaxPowerKw() * 1000
		filters.MaxPowerWatts = &w
	}

	for _, f := range req.GetFieldFilters() {
		if _, ok := allowedSearchFieldPaths[f.GetField()]; !ok {
			return filters, status.Errorf(codes.InvalidArgument, "unsupported field: %s", f.GetField())
		}

		if len(f.GetValues()) == 0 {
			continue
		}

		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field:  f.GetField(),
			Values: f.GetValues(),
		})
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

func (h *Handler) SubmitVariantRating(ctx context.Context, req *registryv1.SubmitVariantRatingRequest) (*registryv1.SubmitVariantRatingResponse, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, err
	}

	if identity.UserType != "individual" {
		return nil, status.Error(codes.PermissionDenied, "only individual accounts can submit ratings")
	}

	variantID, err := uuid.Parse(req.GetVariantId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid variant_id")
	}

	if len(req.GetRatings()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "ratings is required")
	}

	identityID, err := uuid.Parse(identity.ID)
	if err != nil {
		return nil, status.Error(codes.Internal, "invalid identity id from proxy")
	}

	inputs := make([]charger.RatingInput, len(req.GetRatings()))
	for i, r := range req.GetRatings() {
		inputs[i] = charger.RatingInput{CategoryName: r.GetCategoryName(), Score: int(r.GetScore())}
	}

	summary, err := h.charger.SubmitRating(ctx, variantID, identityID, inputs)
	if err != nil {
		switch {
		case errors.Is(err, charger.ErrNotFound):
			return nil, status.Error(codes.NotFound, "charger not found")
		case errors.Is(err, charger.ErrInvalidCategory), errors.Is(err, charger.ErrInvalidScore):
			return nil, status.Error(codes.InvalidArgument, err.Error())
		default:
			return nil, status.Error(codes.Internal, err.Error())
		}
	}

	return &registryv1.SubmitVariantRatingResponse{
		VariantId: variantID.String(),
		Ratings:   ratingsSummaryToProto(summary),
	}, nil
}
