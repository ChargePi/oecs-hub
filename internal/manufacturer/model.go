package manufacturer

import (
	"time"

	"github.com/google/uuid"
)

type Contact struct {
	Name    string
	Email   string
	Phone   string
	Website string
}

// Manufacturer is a charger manufacturer known to the registry. A row only exists once
// an admin has either created it directly (CreateManufacturer) or a submitted charger
// spec referencing it has been verified - see charger.Service.ChangeStatus.
type Manufacturer struct {
	ID uuid.UUID

	// OwnerIdentityID is the Kratos identity ID of the manufacturer account that owns
	// this row, if any. Nil for rows created directly by an admin (CreateManufacturer)
	// that no self-registered account has claimed yet - see Repository.FindOrCreateForIdentity.
	OwnerIdentityID *uuid.UUID

	Name      string
	Country   string
	Contact   Contact
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Summary is a Manufacturer plus aggregate counts over its verified catalog.
type Summary struct {
	Manufacturer Manufacturer
	ProductCount int64
	VariantCount int64
}
