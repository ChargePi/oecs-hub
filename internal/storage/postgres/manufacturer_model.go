package postgres

import (
	"time"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/google/uuid"
)

type manufacturerEntity struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name           string    `gorm:"column:name;not null"`
	Country        *string   `gorm:"column:country"`
	ContactName    *string   `gorm:"column:contact_name"`
	ContactEmail   *string   `gorm:"column:contact_email"`
	ContactPhone   *string   `gorm:"column:contact_phone"`
	ContactWebsite *string   `gorm:"column:contact_website"`
	CreatedAt      time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (manufacturerEntity) TableName() string {
	return "manufacturers"
}

func manufacturerToEntity(m *manufacturer.Manufacturer) *manufacturerEntity {
	return &manufacturerEntity{
		ID:             m.ID,
		Name:           m.Name,
		Country:        strPtrOrNil(m.Country),
		ContactName:    strPtrOrNil(m.Contact.Name),
		ContactEmail:   strPtrOrNil(m.Contact.Email),
		ContactPhone:   strPtrOrNil(m.Contact.Phone),
		ContactWebsite: strPtrOrNil(m.Contact.Website),
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func manufacturerToDomain(e *manufacturerEntity) *manufacturer.Manufacturer {
	return &manufacturer.Manufacturer{
		ID:      e.ID,
		Name:    e.Name,
		Country: strOrEmpty(e.Country),
		Contact: manufacturer.Contact{
			Name:    strOrEmpty(e.ContactName),
			Email:   strOrEmpty(e.ContactEmail),
			Phone:   strOrEmpty(e.ContactPhone),
			Website: strOrEmpty(e.ContactWebsite),
		},
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}

	return &s
}

func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}

	return *s
}
