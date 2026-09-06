// Package kratos talks to Kratos's admin API directly, container-to-container - unlike
// internal/auth, which only trusts identity headers Oathkeeper already verified against a
// session. Used where the backend needs a value Oathkeeper doesn't forward (company name),
// rather than growing the header-passthrough contract for every display field a handler
// might someday want.
package kratos

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

// AdminClient reads identity traits from Kratos's admin API (serve.admin, not the public
// self-service API) - never reachable outside the docker network, see
// deployments/docker/kratos/kratos.yml.
type AdminClient struct {
	baseURL string
	http    *http.Client
}

func NewAdminClient(baseURL string) *AdminClient {
	return &AdminClient{baseURL: baseURL, http: http.DefaultClient}
}

type identity struct {
	Traits struct {
		Company struct {
			Name string `json:"name"`
		} `json:"company"`
	} `json:"traits"`
}

// CompanyName returns the identity's traits.company.name (identity.manufacturer.schema.json).
// Individual accounts have no company trait, so a missing value is returned as "" rather
// than an error.
func (c *AdminClient) CompanyName(ctx context.Context, identityID uuid.UUID) (string, error) {
	req, err := http.NewRequestWithContext(
		ctx, http.MethodGet, fmt.Sprintf("%s/admin/identities/%s", c.baseURL, identityID), nil,
	)
	if err != nil {
		return "", fmt.Errorf("kratos: build request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("kratos: lookup identity %s: %w", identityID, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("kratos: lookup identity %s: unexpected status %d", identityID, resp.StatusCode)
	}

	var id identity
	if err := json.NewDecoder(resp.Body).Decode(&id); err != nil {
		return "", fmt.Errorf("kratos: decode identity %s: %w", identityID, err)
	}

	return id.Traits.Company.Name, nil
}
