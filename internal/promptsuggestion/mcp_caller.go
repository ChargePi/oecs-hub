package promptsuggestion

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// MCPToolCaller is the literal MCP-call boundary the chargers/comparison generators depend on -
// narrow enough to fake in tests without spinning up a real MCP server.
type MCPToolCaller interface {
	CallTool(ctx context.Context, name string, args map[string]any) (*mcp.CallToolResult, error)
}

// inProcessMCPCaller calls tools on an *server.MCPServer running in this same process (the one
// cmd/app/main.go already builds for the /mcp endpoint) via mcp-go's in-process transport - a
// genuine MCP protocol call, with no network hop.
type inProcessMCPCaller struct {
	cli *client.Client
}

// NewInProcessMCPCaller wraps srv in an MCP client connected via mcp-go's in-process transport,
// completing the initialize handshake up front (mirrors oecs-recommendation-agent's
// internal/agent/catalog.NewMCPClient, but over an in-process transport instead of Streamable
// HTTP since the MCP server lives in this same process).
func NewInProcessMCPCaller(ctx context.Context, srv *server.MCPServer) (MCPToolCaller, error) {
	cli, err := client.NewInProcessClient(srv)
	if err != nil {
		return nil, fmt.Errorf("create in-process mcp client: %w", err)
	}

	if err := cli.Start(ctx); err != nil {
		return nil, fmt.Errorf("start in-process mcp client: %w", err)
	}

	initReq := mcp.InitializeRequest{}
	initReq.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initReq.Params.ClientInfo = mcp.Implementation{Name: "oecs-hub-promptsuggestion", Version: "0.1.0"}

	if _, err := cli.Initialize(ctx, initReq); err != nil {
		return nil, fmt.Errorf("initialize in-process mcp client: %w", err)
	}

	return &inProcessMCPCaller{cli: cli}, nil
}

func (c *inProcessMCPCaller) CallTool(ctx context.Context, name string, args map[string]any) (*mcp.CallToolResult, error) {
	req := mcp.CallToolRequest{}
	req.Params.Name = name
	req.Params.Arguments = args

	result, err := c.cli.CallTool(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("call %s: %w", name, err)
	}

	if result.IsError {
		return nil, fmt.Errorf("%s tool returned an error", name)
	}

	return result, nil
}
