package grpc

import (
	"context"
	"testing"

	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func ctxAs(userType string) context.Context {
	return auth.WithIdentity(context.Background(), &auth.Identity{ID: uuid.NewString(), UserType: userType})
}

func TestRequireUserChargersIdentity(t *testing.T) {
	tests := map[string]codes.Code{
		auth.UserTypeIndividual:   codes.OK,
		auth.UserTypeBusiness:     codes.OK,
		auth.UserTypeManufacturer: codes.PermissionDenied,
		auth.UserTypeAdmin:        codes.PermissionDenied,
	}

	for userType, want := range tests {
		t.Run(userType, func(t *testing.T) {
			_, err := requireUserChargersIdentity(ctxAs(userType))
			if got := status.Code(err); got != want {
				t.Fatalf("expected %v, got %v (%v)", want, got, err)
			}
		})
	}

	t.Run("no identity", func(t *testing.T) {
		_, err := requireUserChargersIdentity(context.Background())
		if status.Code(err) != codes.Unauthenticated {
			t.Fatalf("expected Unauthenticated, got %v", err)
		}
	})
}

func TestRequireManufacturerIdentity(t *testing.T) {
	tests := map[string]codes.Code{
		auth.UserTypeManufacturer: codes.OK,
		auth.UserTypeBusiness:     codes.PermissionDenied,
		auth.UserTypeIndividual:   codes.PermissionDenied,
	}

	for userType, want := range tests {
		t.Run(userType, func(t *testing.T) {
			_, err := requireManufacturerIdentity(ctxAs(userType))
			if got := status.Code(err); got != want {
				t.Fatalf("expected %v, got %v (%v)", want, got, err)
			}
		})
	}
}

func TestHandler_SubmitChargerSpecIsManufacturerOnly(t *testing.T) {
	// Rejection happens before any dependency is touched, so a bare Handler suffices.
	h := &Handler{}

	for _, userType := range []string{auth.UserTypeBusiness, auth.UserTypeIndividual} {
		t.Run(userType, func(t *testing.T) {
			_, err := h.SubmitChargerSpec(ctxAs(userType), &registryv1.SubmitChargerSpecRequest{Spec: []byte("{}")})
			if status.Code(err) != codes.PermissionDenied {
				t.Fatalf("expected PermissionDenied, got %v", err)
			}
		})
	}
}
