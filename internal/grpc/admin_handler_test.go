package grpc

import (
	"context"
	"errors"
	"fmt"
	"testing"

	adminv1 "github.com/ChargePi/oecs-hub/gen/proto/admin/v1"
	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeAdminChargerService struct {
	gotID             uuid.UUID
	gotSpec           []byte
	gotManufacturerID uuid.UUID
	charger           *charger.Charger
	err               error
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

func (f *fakeAdminChargerService) ReassignManufacturer(_ context.Context, id, manufacturerID uuid.UUID) (*charger.Charger, error) {
	f.gotID = id
	f.gotManufacturerID = manufacturerID

	return f.charger, f.err
}

type fakeAdminManufacturerService struct {
	got      *manufacturer.Manufacturer
	gotOwner uuid.UUID
	err      error
}

func (f *fakeAdminManufacturerService) Create(_ context.Context, m *manufacturer.Manufacturer) (*manufacturer.Manufacturer, error) {
	f.got = m
	if f.err != nil {
		return nil, f.err
	}

	m.ID = uuid.New()

	return m, nil
}

func (f *fakeAdminManufacturerService) SetOwner(_ context.Context, id, ownerIdentityID uuid.UUID) (*manufacturer.Manufacturer, error) {
	f.gotOwner = ownerIdentityID
	if f.err != nil {
		return nil, f.err
	}

	return &manufacturer.Manufacturer{ID: id, Name: "Acme", OwnerIdentityID: &ownerIdentityID}, nil
}

func (f *fakeAdminManufacturerService) List(context.Context, *string, *string, uint32, uint32) ([]*manufacturer.Summary, int64, error) {
	return nil, 0, nil
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

func TestAdminHandler_ReassignSchemaManufacturer(t *testing.T) {
	validID := uuid.NewString()

	errorCases := []struct {
		name string
		req  *adminv1.ReassignSchemaManufacturerRequest
		err  error
		want codes.Code
	}{
		{"invalid id", &adminv1.ReassignSchemaManufacturerRequest{Id: "nope", ManufacturerId: validID}, nil, codes.InvalidArgument},
		{"invalid manufacturer id", &adminv1.ReassignSchemaManufacturerRequest{Id: validID, ManufacturerId: "nope"}, nil, codes.InvalidArgument},
		{"charger not found", &adminv1.ReassignSchemaManufacturerRequest{Id: validID, ManufacturerId: validID}, fmt.Errorf("reassign: %w", charger.ErrNotFound), codes.NotFound},
		{"manufacturer not found", &adminv1.ReassignSchemaManufacturerRequest{Id: validID, ManufacturerId: validID}, fmt.Errorf("reassign: %w", manufacturer.ErrNotFound), codes.NotFound},
		{"invalid spec", &adminv1.ReassignSchemaManufacturerRequest{Id: validID, ManufacturerId: validID}, fmt.Errorf("%w: bad country", charger.ErrInvalidSpec), codes.InvalidArgument},
		{"other failure", &adminv1.ReassignSchemaManufacturerRequest{Id: validID, ManufacturerId: validID}, errors.New("boom"), codes.Internal},
	}

	for _, tc := range errorCases {
		t.Run(tc.name, func(t *testing.T) {
			h := NewAdminHandler(&fakeAdminChargerService{err: tc.err}, nil)

			_, err := h.ReassignSchemaManufacturer(context.Background(), tc.req)
			if status.Code(err) != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, err)
			}
		})
	}

	t.Run("happy path forwards both ids", func(t *testing.T) {
		id, manufacturerID := uuid.New(), uuid.New()
		fake := &fakeAdminChargerService{charger: &charger.Charger{ID: id, ManufacturerID: &manufacturerID, ManufacturerName: "Acme"}}
		h := NewAdminHandler(fake, nil)

		resp, err := h.ReassignSchemaManufacturer(context.Background(), &adminv1.ReassignSchemaManufacturerRequest{Id: id.String(), ManufacturerId: manufacturerID.String()})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if fake.gotID != id || fake.gotManufacturerID != manufacturerID {
			t.Fatalf("service called with id=%v manufacturer_id=%v", fake.gotID, fake.gotManufacturerID)
		}

		if resp.GetVariant().GetSummary().GetId() != id.String() {
			t.Fatalf("unexpected variant: %+v", resp.GetVariant())
		}
	})
}

func TestAdminHandler_CreateManufacturer(t *testing.T) {
	errorCases := []struct {
		name string
		req  *adminv1.CreateManufacturerRequest
		err  error
		want codes.Code
	}{
		{"blank name", &adminv1.CreateManufacturerRequest{Name: "  "}, nil, codes.InvalidArgument},
		{"duplicate", &adminv1.CreateManufacturerRequest{Name: "Acme"}, fmt.Errorf("create manufacturer: %w", manufacturer.ErrAlreadyExists), codes.AlreadyExists},
		{"other failure", &adminv1.CreateManufacturerRequest{Name: "Acme"}, errors.New("boom"), codes.Internal},
	}

	for _, tc := range errorCases {
		t.Run(tc.name, func(t *testing.T) {
			h := NewAdminHandler(nil, &fakeAdminManufacturerService{err: tc.err})

			_, err := h.CreateManufacturer(context.Background(), tc.req)
			if status.Code(err) != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, err)
			}
		})
	}

	t.Run("happy path trims name and country", func(t *testing.T) {
		fake := &fakeAdminManufacturerService{}
		h := NewAdminHandler(nil, fake)
		country := " DE "

		resp, err := h.CreateManufacturer(context.Background(), &adminv1.CreateManufacturerRequest{Name: " Acme ", Country: &country})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if fake.got.Name != "Acme" || fake.got.Country != "DE" {
			t.Fatalf("service called with %+v", fake.got)
		}

		if resp.GetManufacturer().GetName() != "Acme" || resp.GetManufacturer().GetCountry() != "DE" {
			t.Fatalf("unexpected manufacturer: %+v", resp.GetManufacturer())
		}
	})
}

func TestAdminHandler_SetManufacturerOwner(t *testing.T) {
	validID := uuid.NewString()

	errorCases := []struct {
		name string
		req  *adminv1.SetManufacturerOwnerRequest
		err  error
		want codes.Code
	}{
		{"invalid manufacturer id", &adminv1.SetManufacturerOwnerRequest{ManufacturerId: "nope", OwnerIdentityId: validID}, nil, codes.InvalidArgument},
		{"missing owner", &adminv1.SetManufacturerOwnerRequest{ManufacturerId: validID}, nil, codes.InvalidArgument},
		{"invalid owner id", &adminv1.SetManufacturerOwnerRequest{ManufacturerId: validID, OwnerIdentityId: "nope"}, nil, codes.InvalidArgument},
		{"not found", &adminv1.SetManufacturerOwnerRequest{ManufacturerId: validID, OwnerIdentityId: validID}, fmt.Errorf("set owner: %w", manufacturer.ErrNotFound), codes.NotFound},
		{"owner already linked elsewhere", &adminv1.SetManufacturerOwnerRequest{ManufacturerId: validID, OwnerIdentityId: validID}, fmt.Errorf("set owner: %w", manufacturer.ErrOwnershipConflict), codes.FailedPrecondition},
		{"other failure", &adminv1.SetManufacturerOwnerRequest{ManufacturerId: validID, OwnerIdentityId: validID}, errors.New("boom"), codes.Internal},
	}

	for _, tc := range errorCases {
		t.Run(tc.name, func(t *testing.T) {
			fake := &fakeAdminManufacturerService{err: tc.err}
			h := NewAdminHandler(nil, fake)

			_, err := h.SetManufacturerOwner(context.Background(), tc.req)
			if status.Code(err) != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, err)
			}

			if tc.err == nil && fake.gotOwner != uuid.Nil {
				t.Fatal("expected the service not to be called")
			}
		})
	}

	t.Run("happy path forwards the owner", func(t *testing.T) {
		owner := uuid.New()
		fake := &fakeAdminManufacturerService{}
		h := NewAdminHandler(nil, fake)

		resp, err := h.SetManufacturerOwner(context.Background(), &adminv1.SetManufacturerOwnerRequest{ManufacturerId: validID, OwnerIdentityId: owner.String()})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if fake.gotOwner != owner || resp.GetOwnerIdentityId() != owner.String() {
			t.Fatalf("unexpected owner: forwarded=%v returned=%q", fake.gotOwner, resp.GetOwnerIdentityId())
		}
	})
}
