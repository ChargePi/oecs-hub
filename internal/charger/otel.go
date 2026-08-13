package charger

import (
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
)

func idAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("charger.id", id.String())
}

func statusAttr(status Status) attribute.KeyValue {
	return attribute.String("charger.status", string(status))
}
