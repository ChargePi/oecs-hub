// Package graph maintains the read-side Memgraph projection of the
// manufacturer -> product(series) -> variant hierarchy. Postgres remains the source of
// truth for everything (specs, review status, search); this projection exists purely
// so RegistryService.GetManufacturer can serve a graph traversal cheaply. It is kept in
// sync synchronously by manufacturer.Service and charger.Service on writes.
package graph

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel"
)

var tracer = otel.Tracer("graph.client")

// Client wraps a Memgraph connection. Memgraph speaks the Bolt protocol, so the
// standard Neo4j Go driver is used to talk to it.
type Client struct {
	driver neo4j.DriverWithContext
}

func NewClient(uri, username, password string) (*Client, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(username, password, ""))
	if err != nil {
		return nil, fmt.Errorf("create memgraph driver: %w", err)
	}

	return &Client{driver: driver}, nil
}

func (c *Client) VerifyConnectivity(ctx context.Context) error {
	return c.driver.VerifyConnectivity(ctx)
}

func (c *Client) Close(ctx context.Context) error {
	return c.driver.Close(ctx)
}

func (c *Client) writeSession(ctx context.Context) neo4j.SessionWithContext {
	return c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
}

func (c *Client) readSession(ctx context.Context) neo4j.SessionWithContext {
	return c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
}
