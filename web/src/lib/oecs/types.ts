/**
 * TypeScript mirror of the OECS (Open EV Charger Specification) charger.schema.json v1.0.0.
 * Field names and enum values match the schema exactly — see
 * oecs-scraper/internal/schema/*.schema.json in the sibling repo for the source of truth.
 */

export interface Quantity {
  value: number
  unit: string
}

export interface ValueRange {
  min?: number
  max?: number
  nominal?: number
  unit: string
}

export interface Contact {
  name?: string
  email?: string
  phone?: string
  website?: string
}

export type ChargerType = 'AC' | 'DC' | 'portable-evse' | 'wireless'
export type ModelStatus = 'pre-release' | 'active' | 'discontinued' | 'end-of-life'

export interface Manufacturer {
  id: string
  name: string
  country?: string
  contact?: Contact
}

export interface ChargerModel {
  name: string
  partNumber?: string
  series?: string
  hardwareRevision?: string
  releaseDate?: string
  status?: ModelStatus
  type: ChargerType
  level?: string
  productImageUrl?: string
  brandingOptions?: string[]
}

export type ConnectorType =
  | 'Type1_J1772'
  | 'Type2_Mennekes'
  | 'Type3A'
  | 'CCS1_Combo1'
  | 'CCS2_Combo2'
  | 'CHAdeMO'
  | 'GBT_AC'
  | 'GBT_DC'
  | 'NACS_Tesla'
  | 'Domestic_Socket'
  | 'Industrial_IEC60309'
  | 'MCS_MegawattChargingSystem'
  | 'Other'

export type CurrentType = 'AC' | 'DC'

export interface Cable {
  attached?: boolean
  length?: Quantity
  retractable?: boolean
  cooling?: 'none' | 'forced-air' | 'liquid'
}

export interface Connector {
  label?: string
  type: ConnectorType
  currentType: CurrentType
  phases?: 1 | 2 | 3
  ratedVoltage?: ValueRange
  ratedCurrent?: Quantity
  maxPower?: Quantity
  cable?: Cable
  connectorLock?: boolean
  meterAccuracyClass?: string
  isoPlugAndCharge?: boolean
  bidirectional?: boolean
}

export interface ElectricalInput {
  phases?: 1 | 2 | 3
  voltage?: ValueRange
  frequency?: ValueRange
  maxCurrent?: Quantity
  connectionType?: 'hardwired' | 'plug-in'
  powerFactor?: number
  efficiency?: number
  standbyPower?: Quantity
}

export interface PowerOutput {
  minPower?: Quantity
  maxPower?: Quantity
  ratedOutputCurrent?: ValueRange
  ratedOutputVoltage?: ValueRange
  simultaneousChargingSupported?: boolean
  dynamicPowerSharing?: boolean
}

export interface Protection {
  residualCurrentDevice?: {
    types?: string[]
    ratedResidualCurrent?: Quantity
    external?: boolean
  }
  surgeProtection?: string
  overVoltageCategory?: 'I' | 'II' | 'III' | 'IV'
  features?: string[]
}

export interface Electrical {
  input?: ElectricalInput
  output?: PowerOutput
  protection?: Protection
}

export interface Housing {
  formFactor?: string
  material?: string
  ingressProtection?: string
  impactRating?: string
  operatingTemperature?: { min?: number; max?: number; nominal?: number; unit: 'C' | 'F' }
  dimensions?: { height: number; width: number; depth: number; unit: string }
  weight?: Quantity
  color?: string
  coolingMethod?: 'passive' | 'forced-air' | 'liquid'
  noiseLevel?: Quantity
}

export interface Display {
  type?: 'none' | 'led-indicator' | 'led-segment' | 'monochrome-lcd' | 'color-lcd' | 'touchscreen'
  size?: Quantity
  resolution?: string
}

export interface UserInterface {
  display?: Display
  authenticationMethods?: string[]
  languageSupport?: string[]
  audioFeedback?: boolean
  accessibilityFeatures?: string[]
}

export interface Connectivity {
  interfaces?: string[]
  wifi?: string[]
  cellular?: { generations?: string[]; simSlots?: number; esim?: boolean }
}

export interface Meter {
  integrated?: boolean
  manufacturer?: string
  model?: string
  accuracyClass?: string
  certification?: string
}

export type CertificateType =
  | 'safety'
  | 'emc'
  | 'type-approval'
  | 'cybersecurity'
  | 'protocol-conformance'
  | 'energy-efficiency'
  | 'environmental'
  | 'quality-management'
  | 'accessibility'
  | 'other'

export interface Certificate {
  type: CertificateType
  standard: string
  certificateNumber?: string
  issuingBody?: string
  issueDate?: string
  expiryDate?: string
  jurisdiction?: string
  documentUrl?: string
}

export interface Hardware {
  housing?: Housing
  electrical?: Electrical
  connectors: Connector[]
  userInterface?: UserInterface
  connectivity?: Connectivity
  safety?: { features?: string[] }
  meter?: Meter
  certifications?: Certificate[]
}

export type ProtocolName =
  | 'OCPP'
  | 'OCPI'
  | 'OSCP'
  | 'ISO15118'
  | 'IEC61851'
  | 'DIN70121'
  | 'OpenADR'
  | 'IEEE2030.5'
  | 'EEBus'
  | 'Modbus-TCP'
  | 'Modbus-RTU'
  | 'SunSpec'
  | 'MQTT'
  | 'REST-API'
  | 'SNMP'
  | 'other'

export interface Protocol {
  name: ProtocolName
  otherName?: string
  version: string
  transport?: string[]
  securityProfile?: string
  profiles?: string[]
  certifications?: Certificate[]
  notes?: string
}

export interface SmartCharging {
  features?: (
    | 'local-load-balancing'
    | 'backend-managed-profiles'
    | 'dynamic-pricing'
    | 'v2g'
    | 'v2h'
    | 'solar-integration'
  )[]
  scheduleTypes?: string[]
}

export interface Software {
  firmware?: { currentVersion?: string; updateMethods?: string[] }
  protocols: Protocol[]
  smartCharging?: SmartCharging
  integration?: { webUI?: boolean; localInterfaces?: string[]; apiDocumentationUrl?: string }
  offlineChargingSupported?: boolean
  operatingSystem?: string
}

export type PaymentMethod =
  | 'contactless-card'
  | 'mobile-wallet'
  | 'rfid-prepaid'
  | 'mobile-app'
  | 'plug-and-charge-autocharge'
  | 'backend-invoicing'
  | 'free-of-charge'

export interface Payment {
  acceptedMethods?: PaymentMethod[]
  adHocPaymentSupported?: boolean
  terminal?: { manufacturer?: string; model?: string; cardReaderTypes?: string[] }
}

/** A manufacturer MSRP amount, optionally scoped to one region/market. */
export interface RegionalPrice {
  region?: string
  value: number
  currency: string
}

/**
 * The manufacturer's own published pricing (MSRP) for this model — schema v1.1.0+. Some
 * manufacturers don't publish a fixed price (pricingModel: 'enquiry'), so `prices` is only
 * present when pricingModel is 'fixed'.
 */
export interface Pricing {
  pricingModel: 'fixed' | 'enquiry'
  prices?: RegionalPrice[]
  notes?: string
}

export type SourceType =
  | 'datasheet'
  | 'user-manual'
  | 'installation-manual'
  | 'functional-specification'
  | 'technical-specification'
  | 'firmware-release-notes'
  | 'api-documentation'
  | 'conformance-test-report'
  | 'vendor-webpage'
  | 'type-approval-filing'
  | 'other'

/** A document the specification was sourced from — a datasheet, manual, spec sheet, etc. */
export interface Source {
  type: SourceType
  title: string
  url?: string
  version?: string
  publisher?: string
  publishedDate?: string
}

export interface Metadata {
  sources?: Source[]
}

/**
 * A single OECS charger record — one manufacturer, one model. This is the "variant" leaf in
 * the explorer graph: multiple variants sharing the same manufacturer + model.series form a
 * product line.
 */
export interface ChargerVariant {
  id: string
  manufacturer: Manufacturer
  model: ChargerModel
  hardware: Hardware
  software: Software
  payment?: Payment
  pricing?: Pricing
  metadata?: Metadata
}

/** Client-side grouping — not a schema entity. A "product" is manufacturer + series. */
export interface Product {
  id: string
  manufacturerId: string
  series: string
  variants: ChargerVariant[]
}
