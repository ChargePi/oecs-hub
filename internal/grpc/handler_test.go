package grpc

import (
	"context"
	"errors"
	"testing"

	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type fakeAccountService struct {
	calledWith uuid.UUID
	err        error
}

func (f *fakeAccountService) DeleteAccount(_ context.Context, identityID uuid.UUID) error {
	f.calledWith = identityID
	return f.err
}

func TestHandler_DeleteAccount(t *testing.T) {
	t.Run("no identity is rejected", func(t *testing.T) {
		h := &Handler{account: &fakeAccountService{}}

		_, err := h.DeleteAccount(context.Background(), &emptypb.Empty{})
		if status.Code(err) != codes.Unauthenticated {
			t.Fatalf("expected Unauthenticated, got %v", err)
		}
	})

	t.Run("account service failure maps to Internal", func(t *testing.T) {
		h := &Handler{account: &fakeAccountService{err: errors.New("boom")}}
		ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: uuid.NewString()})

		_, err := h.DeleteAccount(ctx, &emptypb.Empty{})
		if status.Code(err) != codes.Internal {
			t.Fatalf("expected Internal, got %v", err)
		}
	})

	t.Run("happy path deletes the caller's own identity", func(t *testing.T) {
		identityID := uuid.New()
		fake := &fakeAccountService{}
		h := &Handler{account: fake}
		ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: identityID.String()})

		resp, err := h.DeleteAccount(ctx, &emptypb.Empty{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if resp == nil {
			t.Fatal("expected a non-nil response")
		}

		if fake.calledWith != identityID {
			t.Fatalf("expected DeleteAccount called with %s, got %s", identityID, fake.calledWith)
		}
	})
}

func TestSearchChargersFilters(t *testing.T) {
	t.Run("allow-listed field passes through", func(t *testing.T) {
		req := &registryv1.SearchChargersRequest{
			FieldFilters: []*registryv1.FieldFilter{
				{Field: "hardware.connectors.type", Values: []string{"CCS2_Combo2"}},
			},
		}

		filters, err := searchChargersFilters(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(filters.FieldFilters) != 1 || filters.FieldFilters[0].Field != "hardware.connectors.type" {
			t.Fatalf("expected field filter to pass through, got %+v", filters.FieldFilters)
		}
	})

	t.Run("field not on the allow-list is rejected", func(t *testing.T) {
		req := &registryv1.SearchChargersRequest{
			FieldFilters: []*registryv1.FieldFilter{
				{Field: "hardware; DROP TABLE charger_variants;--", Values: []string{"x"}},
			},
		}

		if _, err := searchChargersFilters(req); err == nil {
			t.Fatal("expected an error for a field path not on the allow-list")
		}
	})

	t.Run("field filter with no values is dropped, not rejected", func(t *testing.T) {
		req := &registryv1.SearchChargersRequest{
			FieldFilters: []*registryv1.FieldFilter{
				{Field: "model.type", Values: nil},
			},
		}

		filters, err := searchChargersFilters(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(filters.FieldFilters) != 0 {
			t.Fatalf("expected no field filters, got %+v", filters.FieldFilters)
		}
	})

	t.Run("power range maps kW to W", func(t *testing.T) {
		minKW, maxKW := 7.0, 22.0
		req := &registryv1.SearchChargersRequest{MinPowerKw: &minKW, MaxPowerKw: &maxKW}

		filters, err := searchChargersFilters(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if filters.MinPowerWatts == nil || *filters.MinPowerWatts != 7000 {
			t.Fatalf("expected min power 7000W, got %v", filters.MinPowerWatts)
		}

		if filters.MaxPowerWatts == nil || *filters.MaxPowerWatts != 22000 {
			t.Fatalf("expected max power 22000W, got %v", filters.MaxPowerWatts)
		}
	})

	t.Run("always scoped to verified chargers", func(t *testing.T) {
		filters, err := searchChargersFilters(&registryv1.SearchChargersRequest{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(filters.Statuses) != 1 || filters.Statuses[0] != charger.StatusVerified {
			t.Fatalf("expected only verified status, got %+v", filters.Statuses)
		}
	})
}
