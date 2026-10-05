package mcp

import (
	"testing"

	"github.com/mark3labs/mcp-go/server"
)

func TestToolAnnotations(t *testing.T) {
	s := server.NewMCPServer("test", "0.0.0")
	RegisterTools(s, nil, nil)
	RegisterUserTools(s, nil, nil)

	actions := map[string]struct{}{"propose_favorite_change": {}, "propose_project_change": {}, "propose_rating": {}}

	for name, tool := range s.ListTools() {
		annotations := tool.Tool.Annotations
		_, isAction := actions[name]

		if *annotations.DestructiveHint != isAction || *annotations.ReadOnlyHint == isAction {
			t.Errorf("%s: destructive=%v readOnly=%v, want destructive=%v", name, *annotations.DestructiveHint, *annotations.ReadOnlyHint, isAction)
		}
	}

	if got := len(s.ListTools()); got != 9 {
		t.Fatalf("expected 9 tools, got %d", got)
	}
}
