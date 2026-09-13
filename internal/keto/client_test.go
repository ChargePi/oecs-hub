package keto

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestClient_GrantAdminRole(t *testing.T) {
	id := uuid.New()

	t.Run("201 is success and sends the expected relation tuple", func(t *testing.T) {
		var body map[string]any

		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode request body: %v", err)
			}
			w.WriteHeader(http.StatusCreated)
		}))
		defer srv.Close()

		if err := NewClient(srv.URL).GrantAdminRole(context.Background(), id); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if body["namespace"] != "Role" || body["object"] != "admin" || body["relation"] != "members" {
			t.Fatalf("unexpected relation tuple: %+v", body)
		}
		if body["subject_id"] != id.String() {
			t.Fatalf("expected subject_id %s, got %v", id, body["subject_id"])
		}
	})

	t.Run("other status is an error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer srv.Close()

		if err := NewClient(srv.URL).GrantAdminRole(context.Background(), id); err == nil {
			t.Fatal("expected an error for a 500 response")
		}
	})
}
