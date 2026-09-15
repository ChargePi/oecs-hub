package grpc

import (
	"context"
	"errors"

	manufacturerv1 "github.com/ChargePi/oecs-hub/gen/proto/manufacturer/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ManufacturerChargerService is the subset of charger.Service the manufacturer
// self-service handler depends on.
type ManufacturerChargerService interface {
	Search(ctx context.Context, filters charger.SearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error)
	CancelSubmission(ctx context.Context, id, submitterIdentityID uuid.UUID) (*charger.Charger, error)
	EditSpecification(ctx context.Context, id, submitterIdentityID uuid.UUID, raw []byte) (*charger.Charger, error)
}

// ManufacturerHandler implements ManufacturerService: a manufacturer-only,
// self-service API for managing the caller's own charger spec submissions. It's
// registered on the public gRPC server alongside RegistryService (not the isolated
// AdminAPI), since manufacturers authenticate through the same Traefik/Oathkeeper
// identity-header edge as any other browser user - see auth.RequireIdentity.
type ManufacturerHandler struct {
	manufacturerv1.UnimplementedManufacturerServiceServer

	charger ManufacturerChargerService
}

func NewManufacturerHandler(charger ManufacturerChargerService) *ManufacturerHandler {
	return &ManufacturerHandler{charger: charger}
}

// requireManufacturerIdentity resolves the authenticated caller and rejects anyone who
// isn't a manufacturer account, returning their identity ID for scoping.
func requireManufacturerIdentity(ctx context.Context) (uuid.UUID, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return uuid.Nil, err
	}

	if identity.UserType != "manufacturer" {
		return uuid.Nil, status.Error(codes.PermissionDenied, "only manufacturer accounts can access this API")
	}

	identityID, err := uuid.Parse(identity.ID)
	if err != nil {
		return uuid.Nil, status.Error(codes.Internal, "invalid identity id from proxy")
	}

	return identityID, nil
}

func (h *ManufacturerHandler) GetManufacturerChargers(ctx context.Context, req *manufacturerv1.GetManufacturerChargersRequest) (*manufacturerv1.GetManufacturerChargersResponse, error) {
	identityID, err := requireManufacturerIdentity(ctx)
	if err != nil {
		return nil, err
	}

	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid page_token")
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), charger.DefaultPageSize, charger.MaxPageSize)

	filters := charger.SearchFilters{SubmitterIdentityID: &identityID}

	chargers, total, err := h.charger.Search(ctx, filters, limit, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &manufacturerv1.GetManufacturerChargersResponse{
		Chargers:      chargersToManufacturerSummaryProto(chargers),
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(chargers), total),
	}, nil
}

func (h *ManufacturerHandler) CancelSubmission(ctx context.Context, req *manufacturerv1.CancelSubmissionRequest) (*manufacturerv1.CancelSubmissionResponse, error) {
	identityID, err := requireManufacturerIdentity(ctx)
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	c, err := h.charger.CancelSubmission(ctx, id, identityID)
	if err != nil {
		if errors.Is(err, charger.ErrNotFound) {
			return nil, status.Error(codes.NotFound, "submission not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &manufacturerv1.CancelSubmissionResponse{Charger: chargerToManufacturerSummaryProto(c)}, nil
}

func (h *ManufacturerHandler) EditSpecification(ctx context.Context, req *manufacturerv1.EditSpecificationRequest) (*manufacturerv1.EditSpecificationResponse, error) {
	identityID, err := requireManufacturerIdentity(ctx)
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	if len(req.GetSpec()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "spec is required")
	}

	c, err := h.charger.EditSpecification(ctx, id, identityID, req.GetSpec())
	if err != nil {
		if errors.Is(err, charger.ErrInvalidSpec) {
			return nil, status.Error(codes.InvalidArgument, err.Error())
		}

		if errors.Is(err, charger.ErrNotFound) {
			return nil, status.Error(codes.NotFound, "submission not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &manufacturerv1.EditSpecificationResponse{Variant: chargerToProto(c)}, nil
}
