import { humanize } from '@/lib/oecs/format'

/**
 * Every facet here maps 1:1 to a generic OECS field_filter dot-path — see
 * internal/grpc/handler.go's allowedSearchFieldPaths on the backend, which must stay in sync
 * with the `field` values below. Manufacturer and Country are handled separately (see
 * filter-sidebar.tsx) since their options are populated dynamically from the manufacturer
 * list rather than a fixed enum. Power is also handled separately - it's a numeric range,
 * not a field_filter.
 */
export type FacetControl = 'multi-select' | 'toggle'

export interface FacetOption {
  value: string
  label: string
}

export interface FacetDefinition {
  id: string
  label: string
  field: string
  control: FacetControl
  options?: FacetOption[]
}

export interface FacetGroup {
  id: string
  label: string
  facets: FacetDefinition[]
}

function options(values: string[]): FacetOption[] {
  return values.map((value) => ({ value, label: humanize(value) }))
}

export const FILTER_GROUPS: FacetGroup[] = [
  {
    id: 'charger-type-status',
    label: 'Charger Type & Status',
    facets: [
      {
        id: 'charger-type',
        label: 'Charger type',
        field: 'model.type',
        control: 'multi-select',
        options: options(['AC', 'DC', 'portable-evse', 'wireless']),
      },
      {
        id: 'model-status',
        label: 'Model status',
        field: 'model.status',
        control: 'multi-select',
        options: options(['pre-release', 'active', 'discontinued', 'end-of-life']),
      },
    ],
  },
  {
    id: 'connectors',
    label: 'Connectors',
    facets: [
      {
        id: 'connector-type',
        label: 'Connector type',
        field: 'hardware.connectors.type',
        control: 'multi-select',
        options: options([
          'Type1_J1772',
          'Type2_Mennekes',
          'Type3A',
          'CCS1_Combo1',
          'CCS2_Combo2',
          'CHAdeMO',
          'GBT_AC',
          'GBT_DC',
          'NACS_Tesla',
          'Domestic_Socket',
          'Industrial_IEC60309',
          'MCS_MegawattChargingSystem',
          'Other',
        ]),
      },
      {
        id: 'bidirectional',
        label: 'Bidirectional (V2G/V2H)',
        field: 'hardware.connectors.bidirectional',
        control: 'toggle',
      },
      {
        id: 'iso-plug-and-charge',
        label: 'ISO 15118 Plug & Charge',
        field: 'hardware.connectors.isoPlugAndCharge',
        control: 'toggle',
      },
      {
        id: 'cable-attached',
        label: 'Cable attached',
        field: 'hardware.connectors.cable.attached',
        control: 'toggle',
      },
      {
        id: 'simultaneous-charging',
        label: 'Simultaneous charging',
        field: 'hardware.electrical.output.simultaneousChargingSupported',
        control: 'toggle',
      },
      {
        id: 'dynamic-power-sharing',
        label: 'Dynamic power sharing',
        field: 'hardware.electrical.output.dynamicPowerSharing',
        control: 'toggle',
      },
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware',
    facets: [
      {
        id: 'form-factor',
        label: 'Form factor',
        field: 'hardware.housing.formFactor',
        control: 'multi-select',
        options: options([
          'wall-mounted',
          'freestanding',
          'pole-mounted',
          'ceiling-mounted',
          'portable',
          'cabinet',
        ]),
      },
      {
        id: 'material',
        label: 'Material',
        field: 'hardware.housing.material',
        control: 'multi-select',
        options: options([
          'aluminum',
          'stainless-steel',
          'powder-coated-steel',
          'polycarbonate',
          'abs-plastic',
          'composite',
          'other',
        ]),
      },
      {
        id: 'cooling-method',
        label: 'Cooling method',
        field: 'hardware.housing.coolingMethod',
        control: 'multi-select',
        options: options(['passive', 'forced-air', 'liquid']),
      },
      {
        id: 'ingress-protection',
        label: 'Ingress protection',
        field: 'hardware.housing.ingressProtection',
        control: 'multi-select',
        options: options(['IP54', 'IP55', 'IP65', 'IP66', 'IP67']),
      },
    ],
  },
  {
    id: 'electrical-input',
    label: 'Electrical Input',
    facets: [
      {
        id: 'phases',
        label: 'Phases',
        field: 'hardware.electrical.input.phases',
        control: 'multi-select',
        options: [
          { value: '1', label: 'Single-phase' },
          { value: '2', label: 'Split-phase' },
          { value: '3', label: 'Three-phase' },
        ],
      },
      {
        id: 'connection-type',
        label: 'Connection type',
        field: 'hardware.electrical.input.connectionType',
        control: 'multi-select',
        options: options(['hardwired', 'plug-in']),
      },
    ],
  },
  {
    id: 'connectivity-smart-charging',
    label: 'Connectivity & Smart Charging',
    facets: [
      {
        id: 'connectivity-interfaces',
        label: 'Interfaces',
        field: 'hardware.connectivity.interfaces',
        control: 'multi-select',
        options: options(['ethernet', 'bluetooth', 'rs485', 'can-bus', 'powerline-communication']),
      },
      {
        id: 'cellular-generations',
        label: 'Cellular generations',
        field: 'hardware.connectivity.cellular.generations',
        control: 'multi-select',
        options: options(['2G', '3G', '4G-LTE', '5G', 'NB-IoT', 'LTE-M']),
      },
      {
        id: 'smart-charging-features',
        label: 'Smart charging features',
        field: 'software.smartCharging.features',
        control: 'multi-select',
        options: options([
          'local-load-balancing',
          'backend-managed-profiles',
          'dynamic-pricing',
          'v2g',
          'v2h',
          'solar-integration',
        ]),
      },
      {
        id: 'offline-charging',
        label: 'Offline charging',
        field: 'software.offlineChargingSupported',
        control: 'toggle',
      },
      {
        id: 'protocol',
        label: 'Protocol',
        field: 'software.protocols.name',
        control: 'multi-select',
        options: options([
          'OCPP',
          'OCPI',
          'OSCP',
          'ISO15118',
          'IEC61851',
          'DIN70121',
          'OpenADR',
          'IEEE2030.5',
          'EEBus',
          'Modbus-TCP',
          'Modbus-RTU',
          'SunSpec',
          'MQTT',
          'REST-API',
          'SNMP',
          'other',
        ]),
      },
    ],
  },
  {
    id: 'user-interface',
    label: 'User Interface',
    facets: [
      {
        id: 'display-type',
        label: 'Display type',
        field: 'hardware.userInterface.display.type',
        control: 'multi-select',
        options: options([
          'none',
          'led-indicator',
          'led-segment',
          'monochrome-lcd',
          'color-lcd',
          'touchscreen',
        ]),
      },
      {
        id: 'authentication-methods',
        label: 'Authentication methods',
        field: 'hardware.userInterface.authenticationMethods',
        control: 'multi-select',
        options: options([
          'rfid',
          'mobile-app',
          'plug-and-charge-iso15118',
          'credit-card',
          'qr-code',
          'ocpp-remote-start',
          'pin-code',
          'autostart-free-vend',
        ]),
      },
    ],
  },
  {
    id: 'payment',
    label: 'Payment',
    facets: [
      {
        id: 'accepted-methods',
        label: 'Accepted methods',
        field: 'payment.acceptedMethods',
        control: 'multi-select',
        options: options([
          'contactless-card',
          'mobile-wallet',
          'rfid-prepaid',
          'mobile-app',
          'plug-and-charge-autocharge',
          'backend-invoicing',
          'free-of-charge',
        ]),
      },
      {
        id: 'ad-hoc-payment',
        label: 'Ad-hoc payment (no app required)',
        field: 'payment.adHocPaymentSupported',
        control: 'toggle',
      },
    ],
  },
  {
    id: 'certifications',
    label: 'Certifications',
    facets: [
      {
        id: 'certificate-type',
        label: 'Certificate type',
        field: 'hardware.certifications.type',
        control: 'multi-select',
        options: options([
          'safety',
          'emc',
          'type-approval',
          'cybersecurity',
          'protocol-conformance',
          'energy-efficiency',
          'environmental',
          'quality-management',
          'accessibility',
          'other',
        ]),
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    facets: [
      {
        id: 'pricing-model',
        label: 'Pricing model',
        field: 'pricing.pricingModel',
        control: 'multi-select',
        options: options(['fixed', 'enquiry']),
      },
    ],
  },
]

export const ALL_FACETS: FacetDefinition[] = FILTER_GROUPS.flatMap((g) => g.facets)
