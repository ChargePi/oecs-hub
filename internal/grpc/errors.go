package grpc

import (
	"context"

	"github.com/grpc-ecosystem/go-grpc-middleware/logging/zap/ctxzap"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// internalError logs err with the request's logger and returns a status carrying only msg,
// so wrapped error chains (SQL, hostnames, downstream services) never reach the caller.
func internalError(ctx context.Context, code codes.Code, msg string, err error) error {
	ctxzap.Extract(ctx).Error(msg, zap.Error(err))

	return status.Error(code, msg)
}
