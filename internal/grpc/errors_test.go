package grpc

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestUserChargersErrorHidesWrappedChain(t *testing.T) {
	tests := map[string]struct {
		err      error
		wantCode codes.Code
		wantMsg  string
	}{
		"dependency failure": {
			err:      fmt.Errorf("list projects: %w", errors.New("dial tcp postgres:5432: connection refused")),
			wantCode: codes.Unavailable,
			wantMsg:  "service unavailable",
		},
		"downstream status": {
			err:      fmt.Errorf("check plan: %w", status.Error(codes.Internal, "billing-service: lago timeout")),
			wantCode: codes.Internal,
			wantMsg:  "request failed",
		},
		"validation": {
			err:      fmt.Errorf("%w: name is longer than %d characters", userchargers.ErrInvalidProject, 120),
			wantCode: codes.InvalidArgument,
			wantMsg:  userchargers.ErrInvalidProject.Error(),
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			st := status.Convert(userChargersError(context.Background(), tt.err))
			if st.Code() != tt.wantCode || st.Message() != tt.wantMsg {
				t.Fatalf("got %v %q, want %v %q", st.Code(), st.Message(), tt.wantCode, tt.wantMsg)
			}
		})
	}
}
