package userchargers

import (
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
)

func identityAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("userchargers.identity.id", id.String())
}

func projectAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("userchargers.project.id", id.String())
}

func variantAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("userchargers.variant.id", id.String())
}
