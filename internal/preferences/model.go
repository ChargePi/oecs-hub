package preferences

import "github.com/google/uuid"

type UnitSystem string

const (
	UnitSystemMetric   UnitSystem = "metric"
	UnitSystemImperial UnitSystem = "imperial"
)

type ViewMode string

const (
	ViewModeSimplified ViewMode = "simplified"
	ViewModeAdvanced   ViewMode = "advanced"
)

type ChatLayout string

const (
	ChatLayoutAuto   ChatLayout = ""
	ChatLayoutDrawer ChatLayout = "drawer"
	ChatLayoutPage   ChatLayout = "page"
)

const (
	DefaultCurrency = "EUR"
	DefaultLanguage = "en"
)

var supportedLanguages = map[string]struct{}{
	"en": {},
}

type Preferences struct {
	IdentityID uuid.UUID
	Currency   string
	UnitSystem UnitSystem
	ViewMode   ViewMode
	ChatLayout ChatLayout
	Language   string
}

func Defaults(identityID uuid.UUID) *Preferences {
	return &Preferences{
		IdentityID: identityID,
		Currency:   DefaultCurrency,
		UnitSystem: UnitSystemMetric,
		ViewMode:   ViewModeAdvanced,
		ChatLayout: ChatLayoutAuto,
		Language:   DefaultLanguage,
	}
}
