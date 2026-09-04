// Package oecsspec mirrors the OECS (Open EV Charger Specification) charger record schema
// (https://github.com/xBlaz3kx/oecs/blob/main/schema/2.0.0/charger.schema.json), version 2.0.0.
// Only populate a nested struct when its required sub-fields are known - Validate is the source
// of truth for what's required.
package oecsspec

const SchemaVersion = "2.0.0"

type Charger struct {
	Schema       string       `json:"$schema,omitempty"`
	Version      string       `json:"version"`
	Manufacturer Manufacturer `json:"manufacturer"`
	Model        Model        `json:"model"`
	Hardware     Hardware     `json:"hardware"`
	Software     *Software    `json:"software,omitempty"`
	Payment      *Payment     `json:"payment,omitempty"`
	Pricing      *Pricing     `json:"pricing,omitempty"`
	Metadata     *Metadata    `json:"metadata,omitempty"`
}

type Contact struct {
	Name    string `json:"name,omitempty"`
	Email   string `json:"email,omitempty"`
	Phone   string `json:"phone,omitempty"`
	Website string `json:"website,omitempty"`
}

type Manufacturer struct {
	Name    string   `json:"name"`
	Country string   `json:"country,omitempty"`
	LogoURL string   `json:"logoUrl,omitempty"`
	Contact *Contact `json:"contact,omitempty"`
}

const (
	ModelStatusPreRelease   = "pre-release"
	ModelStatusActive       = "active"
	ModelStatusDiscontinued = "discontinued"
	ModelStatusEndOfLife    = "end-of-life"
)

const (
	ModelTypeAC           = "AC"
	ModelTypeDC           = "DC"
	ModelTypePortableEVSE = "portable-evse"
	ModelTypeWireless     = "wireless"
)

const (
	BrandingWhiteLabel      = "white-label"
	BrandingCustomFaceplate = "custom-faceplate"
	BrandingCustomizableUI  = "customizable-ui"
	BrandingCustomLEDColor  = "custom-led-color"
)

// ModelLevel* are the allowed values of Model.Level - which ones are valid depends on
// Model.Type: AC is restricted to Level1/Level2, DC to DCFast/DCUltraFast/HPC.
const (
	ModelLevelLevel1      = "Level 1"
	ModelLevelLevel2      = "Level 2"
	ModelLevelDCFast      = "DC Fast"
	ModelLevelDCUltraFast = "DC Ultra-Fast"
	ModelLevelHPC         = "HPC"
)

type Model struct {
	Name             string   `json:"name"`
	PartNumber       string   `json:"partNumber,omitempty"`
	Series           string   `json:"series,omitempty"`
	HardwareRevision string   `json:"hardwareRevision,omitempty"`
	ReleaseDate      string   `json:"releaseDate,omitempty"`
	Status           string   `json:"status,omitempty"`
	Type             string   `json:"type,omitempty"`
	Level            string   `json:"level,omitempty"`
	ProductImageURL  string   `json:"productImageUrl,omitempty"`
	BrandingOptions  []string `json:"brandingOptions,omitempty"`
}

type Quantity struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type ValueRange struct {
	Min     *float64 `json:"min,omitempty"`
	Max     *float64 `json:"max,omitempty"`
	Nominal *float64 `json:"nominal,omitempty"`
	Unit    string   `json:"unit"`
}

type TemperatureRange struct {
	Min     *float64 `json:"min,omitempty"`
	Max     *float64 `json:"max,omitempty"`
	Nominal *float64 `json:"nominal,omitempty"`
	Unit    string   `json:"unit"`
}

type Dimensions3D struct {
	Height float64 `json:"height"`
	Width  float64 `json:"width"`
	Depth  float64 `json:"depth"`
	Unit   string  `json:"unit"`
}

type Hardware struct {
	Housing        *Housing       `json:"housing,omitempty"`
	Electrical     *Electrical    `json:"electrical,omitempty"`
	Connectors     []Connector    `json:"connectors,omitempty"`
	UserInterface  *UserInterface `json:"userInterface,omitempty"`
	Connectivity   *Connectivity  `json:"connectivity,omitempty"`
	Safety         *Safety        `json:"safety,omitempty"`
	Meter          *Meter         `json:"meter,omitempty"`
	Certifications []Certificate  `json:"certifications,omitempty"`
}

const (
	FormFactorWallMounted    = "wall-mounted"
	FormFactorFreestanding   = "freestanding"
	FormFactorPoleMounted    = "pole-mounted"
	FormFactorCeilingMounted = "ceiling-mounted"
	FormFactorPortable       = "portable"
	FormFactorCabinet        = "cabinet"
)

const (
	HousingMaterialAluminum          = "aluminum"
	HousingMaterialStainlessSteel    = "stainless-steel"
	HousingMaterialPowderCoatedSteel = "powder-coated-steel"
	HousingMaterialPolycarbonate     = "polycarbonate"
	HousingMaterialABSPlastic        = "abs-plastic"
	HousingMaterialComposite         = "composite"
	HousingMaterialOther             = "other"
)

const (
	CoolingMethodPassive   = "passive"
	CoolingMethodForcedAir = "forced-air"
	CoolingMethodLiquid    = "liquid"
)

type Housing struct {
	FormFactor           string            `json:"formFactor,omitempty"`
	Material             string            `json:"material,omitempty"`
	IngressProtection    string            `json:"ingressProtection,omitempty"`
	ImpactRating         string            `json:"impactRating,omitempty"`
	OperatingTemperature *TemperatureRange `json:"operatingTemperature,omitempty"`
	StorageTemperature   *TemperatureRange `json:"storageTemperature,omitempty"`
	OperatingHumidity    *ValueRange       `json:"operatingHumidity,omitempty"`
	Dimensions           *Dimensions3D     `json:"dimensions,omitempty"`
	Weight               *Quantity         `json:"weight,omitempty"`
	Color                string            `json:"color,omitempty"`
	CoolingMethod        string            `json:"coolingMethod,omitempty"`
	NoiseLevel           *Quantity         `json:"noiseLevel,omitempty"`
}

const (
	ConnectionTypeHardwired = "hardwired"
	ConnectionTypePlugIn    = "plug-in"
)

type ElectricalInput struct {
	Phases         int         `json:"phases,omitempty"`
	Voltage        *ValueRange `json:"voltage,omitempty"`
	Frequency      *ValueRange `json:"frequency,omitempty"`
	MaxCurrent     *Quantity   `json:"maxCurrent,omitempty"`
	ConnectionType string      `json:"connectionType,omitempty"`
	PowerFactor    float64     `json:"powerFactor,omitempty"`
	Efficiency     float64     `json:"efficiency,omitempty"`
	StandbyPower   *Quantity   `json:"standbyPower,omitempty"`
}

type PowerOutput struct {
	MinPower                      *Quantity   `json:"minPower,omitempty"`
	MaxPower                      *Quantity   `json:"maxPower,omitempty"`
	RatedOutputCurrent            *ValueRange `json:"ratedOutputCurrent,omitempty"`
	RatedOutputVoltage            *ValueRange `json:"ratedOutputVoltage,omitempty"`
	SimultaneousChargingSupported *bool       `json:"simultaneousChargingSupported,omitempty"`
	DynamicPowerSharing           *bool       `json:"dynamicPowerSharing,omitempty"`
}

const (
	RCDTypeAC              = "AC"
	RCDTypeA               = "A"
	RCDTypeB               = "B"
	RCDTypeF               = "F"
	RCDTypeIntegrated6mADC = "integrated-6mA-DC"
)

type ResidualCurrentDevice struct {
	Types                []string  `json:"types,omitempty"`
	RatedResidualCurrent *Quantity `json:"ratedResidualCurrent,omitempty"`
	External             *bool     `json:"external,omitempty"`
}

const (
	OverVoltageCategoryI   = "I"
	OverVoltageCategoryII  = "II"
	OverVoltageCategoryIII = "III"
	OverVoltageCategoryIV  = "IV"
)

const (
	ProtectionFeatureOvercurrent          = "overcurrent"
	ProtectionFeatureShortCircuit         = "short-circuit"
	ProtectionFeatureInsulationMonitoring = "insulation-monitoring"
	ProtectionFeatureGroundFault          = "ground-fault"
	ProtectionFeatureOverTemperature      = "over-temperature"
	ProtectionFeatureOverload             = "overload"
)

type Protection struct {
	ResidualCurrentDevice *ResidualCurrentDevice `json:"residualCurrentDevice,omitempty"`
	SurgeProtection       string                 `json:"surgeProtection,omitempty"`
	OverVoltageCategory   string                 `json:"overVoltageCategory,omitempty"`
	Features              []string               `json:"features,omitempty"`
}

type Electrical struct {
	Input      *ElectricalInput `json:"input,omitempty"`
	Output     *PowerOutput     `json:"output,omitempty"`
	Protection *Protection      `json:"protection,omitempty"`
}

const (
	ConnectorTypeType1J1772         = "Type1_J1772"
	ConnectorTypeType2Mennekes      = "Type2_Mennekes"
	ConnectorTypeType3A             = "Type3A"
	ConnectorTypeCCS1Combo1         = "CCS1_Combo1"
	ConnectorTypeCCS2Combo2         = "CCS2_Combo2"
	ConnectorTypeCHAdeMO            = "CHAdeMO"
	ConnectorTypeGBTAc              = "GBT_AC"
	ConnectorTypeGBTDc              = "GBT_DC"
	ConnectorTypeNACSTesla          = "NACS_Tesla"
	ConnectorTypeDomesticSocket     = "Domestic_Socket"
	ConnectorTypeIndustrialIEC60309 = "Industrial_IEC60309"
	ConnectorTypeMCS                = "MCS_MegawattChargingSystem"
	ConnectorTypeOther              = "Other"
)

const (
	CurrentTypeAC = "AC"
	CurrentTypeDC = "DC"
)

const (
	CableCoolingNone      = "none"
	CableCoolingForcedAir = "forced-air"
	CableCoolingLiquid    = "liquid"
)

type Cable struct {
	Attached    *bool     `json:"attached,omitempty"`
	Length      *Quantity `json:"length,omitempty"`
	Retractable *bool     `json:"retractable,omitempty"`
	Cooling     string    `json:"cooling,omitempty"`
}

type Connector struct {
	Label                       string      `json:"label,omitempty"`
	Type                        string      `json:"type"`
	CurrentType                 string      `json:"currentType"`
	Phases                      int         `json:"phases,omitempty"`
	RatedVoltage                *ValueRange `json:"ratedVoltage,omitempty"`
	RatedCurrent                *Quantity   `json:"ratedCurrent,omitempty"`
	MaxPower                    *Quantity   `json:"maxPower,omitempty"`
	Cable                       *Cable      `json:"cable,omitempty"`
	ConnectorLock               *bool       `json:"connectorLock,omitempty"`
	MeterAccuracyClass          string      `json:"meterAccuracyClass,omitempty"`
	MeterAccuracyClassOtherName string      `json:"meterAccuracyClassOtherName,omitempty"`
	ISOPlugAndCharge            *bool       `json:"isoPlugAndCharge,omitempty"`
	Bidirectional               *bool       `json:"bidirectional,omitempty"`
}

const (
	DisplayTypeNone          = "none"
	DisplayTypeLEDIndicator  = "led-indicator"
	DisplayTypeLEDSegment    = "led-segment"
	DisplayTypeMonochromeLCD = "monochrome-lcd"
	DisplayTypeColorLCD      = "color-lcd"
	DisplayTypeTouchscreen   = "touchscreen"
)

type Display struct {
	Type       string    `json:"type,omitempty"`
	Size       *Quantity `json:"size,omitempty"`
	Resolution string    `json:"resolution,omitempty"`
}

const (
	AuthMethodRFID                  = "rfid"
	AuthMethodMobileApp             = "mobile-app"
	AuthMethodPlugAndChargeISO15118 = "plug-and-charge-iso15118"
	AuthMethodCreditCard            = "credit-card"
	AuthMethodQRCode                = "qr-code"
	AuthMethodOCPPRemoteStart       = "ocpp-remote-start"
	AuthMethodPINCode               = "pin-code"
	AuthMethodAutostartFreeVend     = "autostart-free-vend"
)

const (
	AccessibilityAudioGuidance                 = "audio-guidance"
	AccessibilityBraille                       = "braille"
	AccessibilityAdjustableHeight              = "adjustable-height"
	AccessibilityHighContrastMode              = "high-contrast-mode"
	AccessibilityWheelchairAccessibleClearance = "wheelchair-accessible-clearance"
)

type UserInterface struct {
	Display               *Display `json:"display,omitempty"`
	AuthenticationMethods []string `json:"authenticationMethods,omitempty"`
	LanguageSupport       []string `json:"languageSupport,omitempty"`
	AudioFeedback         *bool    `json:"audioFeedback,omitempty"`
	AccessibilityFeatures []string `json:"accessibilityFeatures,omitempty"`
}

const (
	ConnectivityInterfaceEthernet  = "ethernet"
	ConnectivityInterfaceBluetooth = "bluetooth"
	ConnectivityInterfaceRS485     = "rs485"
	ConnectivityInterfaceCANBus    = "can-bus"
	ConnectivityInterfacePLC       = "powerline-communication"
)

const (
	WifiStandard80211a  = "802.11a"
	WifiStandard80211b  = "802.11b"
	WifiStandard80211g  = "802.11g"
	WifiStandard80211n  = "802.11n"
	WifiStandard80211ac = "802.11ac"
	WifiStandard80211ax = "802.11ax"
)

const (
	CellularGen2G    = "2G"
	CellularGen3G    = "3G"
	CellularGen4GLTE = "4G-LTE"
	CellularGen5G    = "5G"
	CellularGenNBIoT = "NB-IoT"
	CellularGenLTEM  = "LTE-M"
)

type Cellular struct {
	Generations []string `json:"generations,omitempty"`
	SimSlots    int      `json:"simSlots,omitempty"`
	ESim        *bool    `json:"esim,omitempty"`
}

type Connectivity struct {
	Interfaces []string  `json:"interfaces,omitempty"`
	Wifi       []string  `json:"wifi,omitempty"`
	Cellular   *Cellular `json:"cellular,omitempty"`
}

// MeterAccuracyClass* are legal-metrology metering accuracy classifications, shared by
// Connector.MeterAccuracyClass and Meter.AccuracyClass. Other plus the sibling
// *OtherName field covers a classification not listed here.
const (
	MeterAccuracyClassMIDA               = "MID_A"
	MeterAccuracyClassMIDB               = "MID_B"
	MeterAccuracyClassMIDC               = "MID_C"
	MeterAccuracyClassMIDD               = "MID_D"
	MeterAccuracyClassIEC6205321Class1   = "IEC62053-21_Class1"
	MeterAccuracyClassIEC6205321Class2   = "IEC62053-21_Class2"
	MeterAccuracyClassIEC6205322Class02S = "IEC62053-22_Class0.2S"
	MeterAccuracyClassIEC6205322Class05S = "IEC62053-22_Class0.5S"
	MeterAccuracyClassOther              = "other"
)

type Meter struct {
	Integrated             *bool  `json:"integrated,omitempty"`
	Manufacturer           string `json:"manufacturer,omitempty"`
	Model                  string `json:"model,omitempty"`
	AccuracyClass          string `json:"accuracyClass,omitempty"`
	AccuracyClassOtherName string `json:"accuracyClassOtherName,omitempty"`
	Certification          string `json:"certification,omitempty"`
}

const (
	SafetyFeatureEmergencyStop   = "emergency-stop"
	SafetyFeatureTamperDetection = "tamper-detection"
	SafetyFeatureAntiTheftLock   = "anti-theft-lock"
)

type Safety struct {
	Features []string `json:"features,omitempty"`
}

const (
	CertificateTypeSafety              = "safety"
	CertificateTypeEMC                 = "emc"
	CertificateTypeTypeApproval        = "type-approval"
	CertificateTypeCybersecurity       = "cybersecurity"
	CertificateTypeProtocolConformance = "protocol-conformance"
	CertificateTypeEnergyEfficiency    = "energy-efficiency"
	CertificateTypeEnvironmental       = "environmental"
	CertificateTypeQualityManagement   = "quality-management"
	CertificateTypeAccessibility       = "accessibility"
	CertificateTypeOther               = "other"
)

type Certificate struct {
	Type              string    `json:"type"`
	Standard          string    `json:"standard"`
	CertificateNumber string    `json:"certificateNumber,omitempty"`
	IssuingBody       string    `json:"issuingBody,omitempty"`
	IssueDate         string    `json:"issueDate,omitempty"`
	ExpiryDate        string    `json:"expiryDate,omitempty"`
	Jurisdiction      string    `json:"jurisdiction,omitempty"`
	DocumentURL       string    `json:"documentUrl,omitempty"`
	Checksum          *Checksum `json:"checksum,omitempty"`
}

type Checksum struct {
	Algorithm string `json:"algorithm"`
	Value     string `json:"value"`
}

const (
	FirmwareUpdateOTAOCPP            = "ota-ocpp"
	FirmwareUpdateOTAVendorCloud     = "ota-vendor-cloud"
	FirmwareUpdateUSB                = "usb"
	FirmwareUpdateLocalNetwork       = "local-network"
	FirmwareUpdateManualServiceVisit = "manual-service-visit"
)

type Firmware struct {
	CurrentVersion string   `json:"currentVersion,omitempty"`
	UpdateMethods  []string `json:"updateMethods,omitempty"`
}

const (
	ProtocolNameOCPP      = "OCPP"
	ProtocolNameISO15118  = "ISO15118"
	ProtocolNameIEC61851  = "IEC61851"
	ProtocolNameDIN70121  = "DIN70121"
	ProtocolNameIEEE20305 = "IEEE2030.5"
	ProtocolNameEEBus     = "EEBus"
	ProtocolNameModbusTCP = "Modbus-TCP"
	ProtocolNameModbusRTU = "Modbus-RTU"
	ProtocolNameSunSpec   = "SunSpec"
	ProtocolNameMQTT      = "MQTT"
	ProtocolNameRESTAPI   = "REST-API"
	ProtocolNameSNMP      = "SNMP"
	ProtocolNameOther     = "other"
)

const (
	ConfigDataTypeString   = "string"
	ConfigDataTypeInteger  = "integer"
	ConfigDataTypeNumber   = "number"
	ConfigDataTypeBoolean  = "boolean"
	ConfigDataTypeEnum     = "enum"
	ConfigDataTypeDateTime = "date-time"
	ConfigDataTypeDuration = "duration"
)

type ConfigurationOption struct {
	Key            string   `json:"key"`
	DataType       string   `json:"dataType"`
	DefaultValue   any      `json:"defaultValue,omitempty"`
	AllowedValues  []any    `json:"allowedValues,omitempty"`
	MinValue       *float64 `json:"minValue,omitempty"`
	MaxValue       *float64 `json:"maxValue,omitempty"`
	Unit           string   `json:"unit,omitempty"`
	ReadOnly       *bool    `json:"readOnly,omitempty"`
	RebootRequired *bool    `json:"rebootRequired,omitempty"`
	Description    string   `json:"description,omitempty"`
}

// Transport* are transport-protocol/payload-format combinations, as "transport/format"
// (e.g. TransportWebsocketJSON for OCPP-J). Other plus the sibling TransportOtherName
// field covers a combination not listed here.
const (
	TransportHTTPJSON      = "http/json"
	TransportHTTPXML       = "http/xml"
	TransportHTTPSOAP      = "http/soap"
	TransportHTTPSJSON     = "https/json"
	TransportHTTPSXML      = "https/xml"
	TransportHTTPSSOAP     = "https/soap"
	TransportWebsocketJSON = "websocket/json"
	TransportTCPXML        = "tcp/xml"
	TransportTCPModbus     = "tcp/modbus"
	TransportSerialModbus  = "serial/modbus"
	TransportCAN           = "can"
	TransportOther         = "other"
)

type Protocol struct {
	Name               string                `json:"name"`
	OtherName          string                `json:"otherName,omitempty"`
	Version            string                `json:"version"`
	Transport          []string              `json:"transport,omitempty"`
	TransportOtherName string                `json:"transportOtherName,omitempty"`
	SecurityProfile    string                `json:"securityProfile,omitempty"`
	Profiles           []string              `json:"profiles,omitempty"`
	Certifications     []Certificate         `json:"certifications,omitempty"`
	Configuration      []ConfigurationOption `json:"configuration,omitempty"`
	Notes              string                `json:"notes,omitempty"`
}

const (
	SmartChargingFeatureLocalLoadBalancing     = "local-load-balancing"
	SmartChargingFeatureBackendManagedProfiles = "backend-managed-profiles"
	SmartChargingFeatureDynamicPricing         = "dynamic-pricing"
	SmartChargingFeatureV2G                    = "v2g"
	SmartChargingFeatureV2H                    = "v2h"
	SmartChargingFeatureSolarIntegration       = "solar-integration"
)

const (
	ScheduleTypeAbsolute        = "absolute"
	ScheduleTypeRecurringDaily  = "recurring-daily"
	ScheduleTypeRecurringWeekly = "recurring-weekly"
	ScheduleTypeRelative        = "relative"
)

type SmartCharging struct {
	Features      []string `json:"features,omitempty"`
	ScheduleTypes []string `json:"scheduleTypes,omitempty"`
}

const (
	LocalInterfaceHTTP      = "http"
	LocalInterfaceGRPC      = "grpc"
	LocalInterfaceMQTT      = "mqtt"
	LocalInterfaceModbus    = "modbus"
	LocalInterfaceWebsocket = "websocket"
	LocalInterfaceWebhooks  = "webhooks"
	LocalInterfaceSSH       = "ssh"
	LocalInterfaceSerial    = "serial"
)

// LocalInterface is a single local integration interface exposed for custom/third-party
// software, with a link to that interface's own documentation, if published.
type LocalInterface struct {
	Type             string `json:"type"`
	DocumentationURL string `json:"documentationUrl,omitempty"`
}

type Integration struct {
	WebUI           *bool            `json:"webUI,omitempty"`
	LocalInterfaces []LocalInterface `json:"localInterfaces,omitempty"`
}

type Software struct {
	Firmware                 *Firmware             `json:"firmware,omitempty"`
	Protocols                []Protocol            `json:"protocols,omitempty"`
	SmartCharging            *SmartCharging        `json:"smartCharging,omitempty"`
	Configuration            []ConfigurationOption `json:"configuration,omitempty"`
	Integration              *Integration          `json:"integration,omitempty"`
	OfflineChargingSupported *bool                 `json:"offlineChargingSupported,omitempty"`
	OperatingSystem          string                `json:"operatingSystem,omitempty"`
}

const (
	PaymentMethodContactlessCard         = "contactless-card"
	PaymentMethodMobileWallet            = "mobile-wallet"
	PaymentMethodRFIDPrepaid             = "rfid-prepaid"
	PaymentMethodMobileApp               = "mobile-app"
	PaymentMethodPlugAndChargeAutocharge = "plug-and-charge-autocharge"
	PaymentMethodFreeOfCharge            = "free-of-charge"
)

const (
	CardReaderContactlessEMV = "contactless-emv"
	CardReaderChipPIN        = "chip-pin"
	CardReaderMagstripe      = "magstripe"
)

type PaymentTerminal struct {
	Manufacturer    string   `json:"manufacturer,omitempty"`
	Model           string   `json:"model,omitempty"`
	CardReaderTypes []string `json:"cardReaderTypes,omitempty"`
	PCICompliance   string   `json:"pciCompliance,omitempty"`
}

type Payment struct {
	AcceptedMethods       []string         `json:"acceptedMethods,omitempty"`
	AdHocPaymentSupported *bool            `json:"adHocPaymentSupported,omitempty"`
	Terminal              *PaymentTerminal `json:"terminal,omitempty"`
}

const (
	PricingModelFixed   = "fixed"
	PricingModelEnquiry = "enquiry"
)

// RegionalPrice is a manufacturer MSRP amount, optionally scoped to one region/market.
type RegionalPrice struct {
	Region   string  `json:"region,omitempty"`
	Value    float64 `json:"value"`
	Currency string  `json:"currency"`
}

// Pricing is the manufacturer's own published pricing (MSRP) for this model - schema v1.1.0+.
// Prices is only present when PricingModel is "fixed".
type Pricing struct {
	PricingModel string          `json:"pricingModel"`
	Prices       []RegionalPrice `json:"prices,omitempty"`
	Notes        string          `json:"notes,omitempty"`
}

const (
	SourceTypeDatasheet               = "datasheet"
	SourceTypeUserManual              = "user-manual"
	SourceTypeInstallationManual      = "installation-manual"
	SourceTypeFunctionalSpecification = "functional-specification"
	SourceTypeTechnicalSpecification  = "technical-specification"
	SourceTypeFirmwareReleaseNotes    = "firmware-release-notes"
	SourceTypeAPIDocumentation        = "api-documentation"
	SourceTypeConformanceTestReport   = "conformance-test-report"
	SourceTypeVendorWebpage           = "vendor-webpage"
	SourceTypeTypeApprovalFiling      = "type-approval-filing"
	SourceTypeOther                   = "other"
)

type Source struct {
	Type          string    `json:"type"`
	Title         string    `json:"title"`
	URL           string    `json:"url,omitempty"`
	Version       string    `json:"version,omitempty"`
	Publisher     string    `json:"publisher,omitempty"`
	PublishedDate string    `json:"publishedDate,omitempty"`
	RetrievedDate string    `json:"retrievedDate,omitempty"`
	Checksum      *Checksum `json:"checksum,omitempty"`
	Notes         string    `json:"notes,omitempty"`
}

type DocumentInfo struct {
	CreatedAt string `json:"createdAt,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty"`
	CreatedBy string `json:"createdBy,omitempty"`
	License   string `json:"license,omitempty"`
	Language  string `json:"language,omitempty"`
	Notes     string `json:"notes,omitempty"`
}

type Metadata struct {
	Sources      []Source      `json:"sources,omitempty"`
	Certificates []Certificate `json:"certificates,omitempty"`
	Document     *DocumentInfo `json:"document,omitempty"`
}
