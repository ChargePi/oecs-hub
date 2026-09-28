package grpc

import (
	"context"
	"errors"
	"fmt"
	"testing"

	adminv1 "github.com/ChargePi/oecs-hub/gen/proto/admin/v1"
	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeAdminChargerService struct {
	gotID   uuid.UUID
	gotSpec []byte
	charger *charger.Charger
	err     error
}

func (f *fakeAdminChargerService) Search(context.Context, charger.SearchFilters, uint32, uint32) ([]*charger.Charger, int64, error) {
	return nil, 0, nil
}

func (f *fakeAdminChargerService) ChangeStatus(context.Context, uuid.UUID, charger.Status) (*charger.Charger, error) {
	return nil, nil
}

func (f *fakeAdminChargerService) AdminEditSpecification(_ context.Context, id uuid.UUID, raw []byte) (*charger.Charger, error) {
	f.gotID = id
	f.gotSpec = raw

	return f.charger, f.err
}

func TestAdminHandler_UpdateSchemaSpec(t *testing.T) {
	validID := uuid.NewString()

	errorCases := []struct {
		name string
		req  *adminv1.UpdateSchemaSpecRequest
		err  error
		want codes.Code
	}{
		{"invalid id", &adminv1.UpdateSchemaSpecRequest{Id: "nope", Spec: []byte(`{}`)}, nil, codes.InvalidArgument},
		{"empty spec", &adminv1.UpdateSchemaSpecRequest{Id: validID}, nil, codes.InvalidArgument},
		{"invalid spec", &adminv1.UpdateSchemaSpecRequest{Id: validID, Spec: []byte(`{}`)}, fmt.Errorf("%w: missing model", charger.ErrInvalidSpec), codes.InvalidArgument},
		{"not found", &adminv1.UpdateSchemaSpecRequest{Id: validID, Spec: []byte(`{}`)}, fmt.Errorf("update charger spec: %w", charger.ErrNotFound), codes.NotFound},
		{"other failure", &adminv1.UpdateSchemaSpecRequest{Id: validID, Spec: []byte(`{}`)}, errors.New("boom"), codes.Internal},
	}

	for _, tc := range errorCases {
		t.Run(tc.name, func(t *testing.T) {
			h := NewAdminHandler(&fakeAdminChargerService{err: tc.err}, nil)

			_, err := h.UpdateSchemaSpec(context.Background(), tc.req)
			if status.Code(err) != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, err)
			}
		})
	}

	t.Run("happy path forwards the spec and returns the updated variant", func(t *testing.T) {
		id := uuid.New()
		spec := []byte(`{"model":{"name":"X"}}`)
		fake := &fakeAdminChargerService{charger: &charger.Charger{ID: id, ModelName: "X", Status: charger.StatusVerified, Spec: spec}}
		h := NewAdminHandler(fake, nil)

		resp, err := h.UpdateSchemaSpec(context.Background(), &adminv1.UpdateSchemaSpecRequest{Id: id.String(), Spec: spec})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if fake.gotID != id || string(fake.gotSpec) != string(spec) {
			t.Fatalf("service called with id=%v spec=%s", fake.gotID, fake.gotSpec)
		}

		summary := resp.GetVariant().GetSummary()
		if summary.GetId() != id.String() || summary.GetModelName() != "X" {
			t.Fatalf("unexpected summary: %+v", summary)
		}

		if summary.GetStatus() != registryv1.SubmissionStatus_SUBMISSION_STATUS_VERIFIED {
			t.Fatalf("expected status to be carried through, got %v", summary.GetStatus())
		}
	})
}
