// Package keto wraps Keto's write API, used to grant the AdminService admin-role relation
// to a newly created admin identity - see deployments/docker/keto/namespaces.keto.ts and
// deployments/docker/oathkeeper/access-rules.yml's admin-service rule.
package keto

import (
	"context"
	"fmt"

	ketoclient "github.com/ory/keto-client-go"

	"github.com/google/uuid"
)

// Client wraps Keto's relationship write API.
type Client struct {
	api *ketoclient.APIClient
}

func NewClient(writeURL string) *Client {
	cfg := ketoclient.NewConfiguration()
	cfg.Servers = ketoclient.ServerConfigurations{{URL: writeURL}}

	return &Client{api: ketoclient.NewAPIClient(cfg)}
}

// GrantAdminRole makes identityID a member of the Role:admin object, matching the
// namespace/relation shape in deployments/docker/keto/namespaces.keto.ts.
func (c *Client) GrantAdminRole(ctx context.Context, identityID uuid.UUID) error {
	subjectID := identityID.String()
	body := ketoclient.CreateRelationshipBody{
		Namespace: ketoclient.PtrString("Role"),
		Object:    ketoclient.PtrString("admin"),
		Relation:  ketoclient.PtrString("members"),
		SubjectId: &subjectID,
	}

	_, resp, err := c.api.RelationshipApi.CreateRelationship(ctx).CreateRelationshipBody(body).Execute()
	if resp != nil {
		defer resp.Body.Close()
	}

	if err != nil {
		return fmt.Errorf("keto: grant admin role to %s: %w", identityID, err)
	}

	return nil
}
