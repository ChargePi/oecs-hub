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

// CreateAdminIdentityParams are the inputs for creating an "admin" schema identity.
type CreateAdminIdentityParams struct {
	Email    string
	Name     string
	Surname  string
	Password string
}

// CreateAdminIdentity creates a new "admin" schema identity with a password credential.
// It's the only supported way to create an admin identity - see cmd/admin-cli.
func (c *SDKClient) CreateAdminIdentity(ctx context.Context, p CreateAdminIdentityParams) (uuid.UUID, error) {
	body := ory.NewCreateIdentityBody("admin", map[string]interface{}{
		"email":   p.Email,
		"name":    p.Name,
		"surname": p.Surname,
	})
	body.Credentials = &ory.IdentityWithCredentials{
		Password: &ory.IdentityWithCredentialsPassword{
			Config: &ory.IdentityWithCredentialsPasswordConfig{Password: &p.Password},
		},
	}

	identity, resp, err := c.api.IdentityAPI.CreateIdentity(ctx).CreateIdentityBody(*body).Execute()
	if resp != nil {
		defer resp.Body.Close()
	}

	if err != nil {
		return uuid.Nil, fmt.Errorf("kratos: create admin identity: %w", err)
	}

	id, err := uuid.Parse(identity.Id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("kratos: parse created identity id %q: %w", identity.Id, err)
	}

	return id, nil
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
