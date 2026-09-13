package kratos

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestSDKClient_CreateAdminIdentity(t *testing.T) {
	params := CreateAdminIdentityParams{
		Email:    "admin@oecs.dev",
		Name:     "Ada",
		Surname:  "Admin",
		Password: "correct-horse-battery-staple",
	}

	t.Run("201 returns the created identity id", func(t *testing.T) {
		id := uuid.New()

		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode request body: %v", err)
			}
			if body["schema_id"] != "admin" {
				t.Fatalf("expected schema_id admin, got %v", body["schema_id"])
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id":         id.String(),
				"schema_id":  "admin",
				"schema_url": "http://kratos/schemas/admin",
				"traits":     body,
			})
		}))
		defer srv.Close()

		got, err := NewSDKClient(srv.URL).CreateAdminIdentity(context.Background(), params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != id {
			t.Fatalf("expected id %s, got %s", id, got)
		}
	})

	t.Run("other status is an error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer srv.Close()

		if _, err := NewSDKClient(srv.URL).CreateAdminIdentity(context.Background(), params); err == nil {
			t.Fatal("expected an error for a 500 response")
		}
	})
}

func TestSDKClient_DeleteIdentity(t *testing.T) {
	id := uuid.New()

	t.Run("204 is success", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		}))
		defer srv.Close()

		if err := NewSDKClient(srv.URL).DeleteIdentity(context.Background(), id); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("404 is treated as already deleted", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
		}))
		defer srv.Close()

		if err := NewSDKClient(srv.URL).DeleteIdentity(context.Background(), id); err != nil {
			t.Fatalf("expected 404 to be treated as success, got %v", err)
		}
	})

	t.Run("other status is an error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer srv.Close()

		if err := NewSDKClient(srv.URL).DeleteIdentity(context.Background(), id); err == nil {
			t.Fatal("expected an error for a 500 response")
		}
	})
}
