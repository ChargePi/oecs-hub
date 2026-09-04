package grpc

import (
	"context"
	"errors"

	adminv1 "github.com/ChargePi/oecs-hub/gen/proto/admin/v1"
	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// AdminChargerService is the subset of charger.Service the admin handler depends on.
type AdminChargerService interface {
	Search(ctx context.Context, filters charger.SearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
	ChangeStatus(ctx context.Context, id uuid.UUID, status charger.Status) (*charger.Charger, error)
}

// AdminManufacturerService is the subset of manufacturer.Service the admin handler
// depends on.
type AdminManufacturerService interface {
	Create(ctx context.Context, m *manufacturer.Manufacturer) (*manufacturer.Manufacturer, error)
}

type AdminHandler struct {
	adminv1.UnimplementedAdminServiceServer

	charger      AdminChargerService
	manufacturer AdminManufacturerService
}

func NewAdminHandler(charger AdminChargerService, manufacturer AdminManufacturerService) *AdminHandler {
	return &AdminHandler{charger: charger, manufacturer: manufacturer}
}

func (h *AdminHandler) SearchSchemas(ctx context.Context, req *adminv1.SearchSchemasRequest) (*adminv1.SearchSchemasResponse, error) {
	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid page_token")
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), charger.DefaultPageSize, charger.MaxPageSize)

	filters := charger.SearchFilters{
		Query: req.Query,
	}

	if req.Country != nil && *req.Country != "" {
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field: "manufacturer.country", Values: []string{*req.Country},
		})
	}

	if len(req.GetProtocols()) > 0 {
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field: "software.protocols.name", Values: req.GetProtocols(),
		})
	}

	if req.ManufacturerId != nil {
		id, err := uuid.Parse(req.GetManufacturerId())
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid manufacturer_id")
		}

		filters.ManufacturerID = &id
	}

	if req.GetChargerType() != registryv1.ChargerType_CHARGER_TYPE_UNSPECIFIED {
		ct := chargerTypeToDomain(req.GetChargerType())
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field: "model.type", Values: []string{ct},
		})
	}

	if req.MinPowerKw != nil {
		w := req.GetMinPowerKw() * 1000
		filters.MinPowerWatts = &w
	}

	if req.MaxPowerKw != nil {
		w := req.GetMaxPowerKw() * 1000
		filters.MaxPowerWatts = &w
	}

	var connectorTypes []string
	for _, ct := range req.GetConnectorTypes() {
		if ct == registryv1.ConnectorType_CONNECTOR_TYPE_UNSPECIFIED {
			continue
		}

		connectorTypes = append(connectorTypes, connectorTypeToDomain(ct))
	}

	if len(connectorTypes) > 0 {
		filters.FieldFilters = append(filters.FieldFilters, charger.FieldFilter{
			Field: "hardware.connectors.type", Values: connectorTypes,
		})
	}

	if req.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_UNSPECIFIED {
		filters.Statuses = []charger.Status{submissionStatusToDomain(req.GetStatus())}
	}

	chargers, total, err := h.charger.Search(ctx, filters, limit, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.SearchSchemasResponse{
		Variants:      chargersToProto(chargers),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(chargers), total),
	}, nil
}

// UpdateSchemaStatus applies an admin decision. status must be
// SUBMISSION_STATUS_VERIFIED or SUBMISSION_STATUS_REJECTED.
func (h *AdminHandler) UpdateSchemaStatus(ctx context.Context, req *adminv1.UpdateSchemaStatusRequest) (*adminv1.UpdateSchemaStatusResponse, error) {
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	if req.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_VERIFIED &&
		req.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_REJECTED {
		return nil, status.Error(codes.InvalidArgument, "status must be SUBMISSION_STATUS_VERIFIED or SUBMISSION_STATUS_REJECTED")
	}

	c, err := h.charger.ChangeStatus(ctx, id, submissionStatusToDomain(req.GetStatus()))
	if err != nil {
		if errors.Is(err, charger.ErrNotFound) {
			return nil, status.Error(codes.NotFound, "charger not found")
		}

		if errors.Is(err, manufacturer.ErrOwnershipConflict) {
			return nil, status.Error(codes.FailedPrecondition, "manufacturer name/country is already owned by a different account; resolve manually before verifying")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.UpdateSchemaStatusResponse{Variant: chargerToProto(c)}, nil
}

func (h *AdminHandler) CreateManufacturer(ctx context.Context, req *adminv1.CreateManufacturerRequest) (*adminv1.CreateManufacturerResponse, error) {
	if req.GetName() == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}

	m := &manufacturer.Manufacturer{
		Name:    req.GetName(),
		Contact: contactToDomain(req.GetContact()),
	}
	if req.Country != nil {
		m.Country = req.GetCountry()
	}

	created, err := h.manufacturer.Create(ctx, m)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.CreateManufacturerResponse{Manufacturer: manufacturerToProto(created)}, nil
}
