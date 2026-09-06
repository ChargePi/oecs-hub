package kratos

import (
	"context"
	"fmt"
	"net/http"

	ory "github.com/ory/client-go"

	"github.com/google/uuid"
)

// SDKClient wraps Kratos's official Go SDK, used for admin API write operations.
type SDKClient struct {
	api *ory.APIClient
}

func NewSDKClient(baseURL string) *SDKClient {
	cfg := ory.NewConfiguration()
	cfg.Servers = ory.ServerConfigurations{{URL: baseURL}}

	return &SDKClient{api: ory.NewAPIClient(cfg)}
}

// DeleteIdentity deletes identityID from Kratos. A 404 is treated as already-deleted.
func (c *SDKClient) DeleteIdentity(ctx context.Context, identityID uuid.UUID) error {
	resp, err := c.api.IdentityAPI.DeleteIdentity(ctx, identityID.String()).Execute()
	if resp != nil {
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotFound {
			return nil
		}
	}

	if err != nil {
		return fmt.Errorf("kratos: delete identity %s: %w", identityID, err)
	}

	return nil
}
