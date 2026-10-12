package preferences

import (
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
)

func identityAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("preferences.identity.id", id.String())
}
