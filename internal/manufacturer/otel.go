package manufacturer

import (
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
)

func idAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("manufacturer.id", id.String())
}

func nameAttr(name string) attribute.KeyValue {
	return attribute.String("manufacturer.name", name)
}
