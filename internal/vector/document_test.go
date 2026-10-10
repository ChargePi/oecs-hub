package vector

import (
	"os"
	"strings"
	"testing"
)

func TestChargerDocument(t *testing.T) {
	cases := map[string][]string{
		"ac-wallbox-full.json":      {"Charger type: AC", "Operating system:", "Protocol: OCPP 1.6", "security profile", "Payment methods: mobile-app, rfid-prepaid"},
		"dc-fast-charger-full.json": {"Charger type: DC", "Connector:", "Maximum power:", "Protocol: ISO15118", "transport websocket/json", "Payment methods:"},
	}

	for file, want := range cases {
		t.Run(file, func(t *testing.T) {
			raw, err := os.ReadFile("../oecsspec/testdata/" + file)
			if err != nil {
				t.Fatalf("read testdata: %v", err)
			}

			doc, err := chargerDocument(raw)
			if err != nil {
				t.Fatalf("chargerDocument: %v", err)
			}

			for _, w := range want {
				if !strings.Contains(doc, w) {
					t.Errorf("document missing %q:\n%s", w, doc)
				}
			}

			if strings.Contains(doc, "\n\n") || strings.Contains(doc, "<no value>") {
				t.Errorf("document has blank lines or missing values:\n%s", doc)
			}
		})
	}

	t.Run("minimal spec", func(t *testing.T) {
		doc, err := chargerDocument([]byte(`{"version":"2.0.0","manufacturer":{"name":"Acme"},"model":{"name":"Bolt"},"hardware":{}}`))
		if err != nil {
			t.Fatalf("chargerDocument: %v", err)
		}

		if doc != "Acme Bolt" {
			t.Errorf("got %q, want %q", doc, "Acme Bolt")
		}
	})

	t.Run("invalid spec", func(t *testing.T) {
		if _, err := chargerDocument([]byte(`not json`)); err == nil {
			t.Fatal("expected an error")
		}
	})
}
