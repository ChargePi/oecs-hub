package grpc

import (
	"context"
	"errors"
	"strings"

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
	AdminEditSpecification(ctx context.Context, id uuid.UUID, raw []byte) (*charger.Charger, error)
	ReassignManufacturer(ctx context.Context, id, manufacturerID uuid.UUID) (*charger.Charger, error)
	Reindex(ctx context.Context) (charger.ReindexResult, error)
}

// AdminManufacturerService is the subset of manufacturer.Service the admin handler
// depends on.
type AdminManufacturerService interface {
	Create(ctx context.Context, m *manufacturer.Manufacturer) (*manufacturer.Manufacturer, error)
	List(ctx context.Context, query, country *string, limit, offset uint32) ([]*manufacturer.Summary, int64, error)
	SetOwner(ctx context.Context, id, ownerIdentityID uuid.UUID) (*manufacturer.Manufacturer, error)
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
// SUBMISSION_STATUS_VERIFIED, SUBMISSION_STATUS_REJECTED, or SUBMISSION_STATUS_ARCHIVED.
func (h *AdminHandler) UpdateSchemaStatus(ctx context.Context, req *adminv1.UpdateSchemaStatusRequest) (*adminv1.UpdateSchemaStatusResponse, error) {
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	if req.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_VERIFIED &&
		req.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_REJECTED &&
		req.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_ARCHIVED {
		return nil, status.Error(codes.InvalidArgument, "status must be SUBMISSION_STATUS_VERIFIED, SUBMISSION_STATUS_REJECTED, or SUBMISSION_STATUS_ARCHIVED")
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

// UpdateSchemaSpec overwrites a submission's spec with a corrected one, regardless of
// its status. The spec is re-validated against the OECS schema; status is unchanged.
func (h *AdminHandler) UpdateSchemaSpec(ctx context.Context, req *adminv1.UpdateSchemaSpecRequest) (*adminv1.UpdateSchemaSpecResponse, error) {
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	if len(req.GetSpec()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "spec is required")
	}

	c, err := h.charger.AdminEditSpecification(ctx, id, req.GetSpec())
	if err != nil {
		if errors.Is(err, charger.ErrInvalidSpec) {
			return nil, status.Error(codes.InvalidArgument, err.Error())
		}

		if errors.Is(err, charger.ErrNotFound) {
			return nil, status.Error(codes.NotFound, "charger not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.UpdateSchemaSpecResponse{Variant: chargerToProto(c)}, nil
}

func (h *AdminHandler) CreateManufacturer(ctx context.Context, req *adminv1.CreateManufacturerRequest) (*adminv1.CreateManufacturerResponse, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}

	m := &manufacturer.Manufacturer{
		Name:    name,
		Country: strings.TrimSpace(req.GetCountry()),
		Contact: contactToDomain(req.GetContact()),
	}

	created, err := h.manufacturer.Create(ctx, m)
	switch {
	case errors.Is(err, manufacturer.ErrAlreadyExists):
		return nil, status.Error(codes.AlreadyExists, "a manufacturer with this name and country already exists")
	case err != nil:
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.CreateManufacturerResponse{Manufacturer: manufacturerToProto(created)}, nil
}

func (h *AdminHandler) ListManufacturers(ctx context.Context, req *adminv1.ListManufacturersRequest) (*adminv1.ListManufacturersResponse, error) {
	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid page_token")
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), manufacturer.DefaultPageSize, manufacturer.MaxPageSize)

	summaries, total, err := h.manufacturer.List(ctx, req.Query, req.Country, limit, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.ListManufacturersResponse{
		Manufacturers: adminManufacturersToProto(summaries),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(summaries), total),
	}, nil
}

// SetManufacturerOwner links a manufacturer to a manufacturer account's Kratos identity,
// replacing any current owner.
func (h *AdminHandler) SetManufacturerOwner(ctx context.Context, req *adminv1.SetManufacturerOwnerRequest) (*adminv1.SetManufacturerOwnerResponse, error) {
	id, err := uuid.Parse(req.GetManufacturerId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid manufacturer_id")
	}

	ownerIdentityID, err := uuid.Parse(req.GetOwnerIdentityId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "owner_identity_id is required and must be a valid id")
	}

	m, err := h.manufacturer.SetOwner(ctx, id, ownerIdentityID)
	switch {
	case errors.Is(err, manufacturer.ErrNotFound):
		return nil, status.Error(codes.NotFound, "manufacturer not found")
	case errors.Is(err, manufacturer.ErrOwnershipConflict):
		return nil, status.Error(codes.FailedPrecondition, "this account already owns a different manufacturer")
	case err != nil:
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.SetManufacturerOwnerResponse{
		Manufacturer:    manufacturerToProto(m),
		OwnerIdentityId: ownerIdentityID.String(),
	}, nil
}

func adminManufacturersToProto(summaries []*manufacturer.Summary) []*adminv1.AdminManufacturer {
	out := make([]*adminv1.AdminManufacturer, len(summaries))
	for i, s := range summaries {
		out[i] = &adminv1.AdminManufacturer{
			Summary:         manufacturerSummaryToProto(s),
			OwnerIdentityId: ownerIdentityIDToProto(s.Manufacturer.OwnerIdentityID),
		}
	}

	return out
}

func ownerIdentityIDToProto(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}

	s := id.String()

	return &s
}

// ReassignSchemaManufacturer links a submission to a different manufacturer regardless
// of its status, rewriting the spec's manufacturer name/country to match.
func (h *AdminHandler) ReassignSchemaManufacturer(ctx context.Context, req *adminv1.ReassignSchemaManufacturerRequest) (*adminv1.ReassignSchemaManufacturerResponse, error) {
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	manufacturerID, err := uuid.Parse(req.GetManufacturerId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid manufacturer_id")
	}

	c, err := h.charger.ReassignManufacturer(ctx, id, manufacturerID)
	switch {
	case errors.Is(err, charger.ErrNotFound):
		return nil, status.Error(codes.NotFound, "charger not found")
	case errors.Is(err, manufacturer.ErrNotFound):
		return nil, status.Error(codes.NotFound, "manufacturer not found")
	case errors.Is(err, charger.ErrInvalidSpec):
		return nil, status.Error(codes.InvalidArgument, err.Error())
	case err != nil:
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.ReassignSchemaManufacturerResponse{Variant: chargerToProto(c)}, nil
}

// ReindexChargers rebuilds the semantic search index from every verified charger.
func (h *AdminHandler) ReindexChargers(ctx context.Context, _ *adminv1.ReindexChargersRequest) (*adminv1.ReindexChargersResponse, error) {
	result, err := h.charger.Reindex(ctx)

	switch {
	case errors.Is(err, charger.ErrSemanticSearchDisabled):
		return nil, status.Error(codes.FailedPrecondition, "semantic search is disabled")
	case err != nil:
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &adminv1.ReindexChargersResponse{
		Indexed: int32(result.Indexed),
		Failed:  int32(result.Failed),
	}, nil
}
