package kratos

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

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
