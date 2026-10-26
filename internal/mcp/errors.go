package mcp

import (
	"errors"

	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/mark3labs/mcp-go/mcp"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// relayedErrors are the domain errors the calling model may see; only their own text is
// relayed, never the wrapped chain.
var relayedErrors = []error{
	userchargers.ErrPaidPlanRequired,
	userchargers.ErrNotFound,
	userchargers.ErrVariantNotFound,
	userchargers.ErrInvalidProject,
	userchargers.ErrInvalidOrdering,
	userchargers.ErrInvalidCategory,
	userchargers.ErrInvalidScore,
	useraction.ErrNotFound,
	useraction.ErrNotPending,
	useraction.ErrInvalidAction,
	preferences.ErrInvalidCurrency,
	preferences.ErrUnsupportedLanguage,
	preferences.ErrInvalidPreferences,
}

// toolError reports err to the calling model as a tool error it can relay to the user.
func toolError(logger *zap.Logger, err error) *mcp.CallToolResult {
	for _, relayed := range relayedErrors {
		if errors.Is(err, relayed) {
			return mcp.NewToolResultError(relayed.Error())
		}
	}

	switch status.Code(err) {
	case codes.Unauthenticated:
		return mcp.NewToolResultError("authentication required")
	case codes.PermissionDenied:
		return mcp.NewToolResultError("not available for this account")
	default:
		return toolFailure(logger, "request failed, try again later", err)
	}
}

// toolFailure logs err and returns a tool error carrying only msg.
func toolFailure(logger *zap.Logger, msg string, err error) *mcp.CallToolResult {
	logger.Error(msg, zap.Error(err))

	return mcp.NewToolResultError(msg)
}
