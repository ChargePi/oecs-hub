package account

import (
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/attribute"
)

func identityAttr(identityID uuid.UUID) attribute.KeyValue {
	return attribute.String("account.identity_id", identityID.String())
}
