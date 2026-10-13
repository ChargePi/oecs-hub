package onboarding

import (
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
)

func identityAttr(id uuid.UUID) attribute.KeyValue {
	return attribute.String("onboarding.identity.id", id.String())
}
