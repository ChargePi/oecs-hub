import { humanize } from '@/lib/oecs/format'

/**
 * Every facet here maps 1:1 to a generic OECS field_filter dot-path — see
 * internal/grpc/handler.go's allowedSearchFieldPaths on the backend, which must stay in sync
 * with the `field` values below. Manufacturer is handled separately (see filter-sidebar.tsx)
 * since its options are populated dynamically from the manufacturer list rather than a fixed
 * enum. Power is also handled separately - it's a numeric range,
 * not a field_filter, and so are the price range and protocols (see PROTOCOL_OPTIONS).
 */
export type FacetControl = 'multi-select' | 'toggle'

export interface FacetOption {
  value: string
  label: string
  /** Spec values this option matches, when it covers more than `value` alone. */
  matches?: string[]
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

function labeled(pairs: [string, string][]): FacetOption[] {
  return pairs.map(([value, label]) => ({ value, label }))
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
        options: labeled([
          ['Type1_J1772', 'Type 1 (J1772)'],
          ['Type2_Mennekes', 'Type 2 (Mennekes)'],
          ['Type3A', 'Type 3A'],
          ['CCS1_Combo1', 'CCS1 (Combo 1)'],
          ['CCS2_Combo2', 'CCS2 (Combo 2)'],
          ['CHAdeMO', 'CHAdeMO'],
          ['GBT_AC', 'GB/T AC'],
          ['GBT_DC', 'GB/T DC'],
          ['NACS_Tesla', 'NACS (SAE J3400)'],
          ['MCS_MegawattChargingSystem', 'MCS (Megawatt)'],
          ['Domestic_Socket', 'Domestic socket'],
          ['Industrial_IEC60309', 'Industrial (IEC 60309)'],
          ['Other', 'Other'],
        ]),
      },
      {
        id: 'cable-attached',
        label: 'Tethered cable',
        field: 'hardware.connectors.cable.attached',
        control: 'toggle',
      },
      {
        id: 'bidirectional',
        label: 'Bidirectional (V2G/V2H/V2L)',
        field: 'hardware.connectors.bidirectional',
        control: 'toggle',
      },
      {
        id: 'iso-plug-and-charge',
        label: 'ISO 15118 Plug & Charge',
        field: 'hardware.connectors.isoPlugAndCharge',
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
    id: 'electrical',
    label: 'Electrical',
    facets: [
      {
        id: 'phases',
        label: 'Input phases',
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
        label: 'Grid connection',
        field: 'hardware.electrical.input.connectionType',
        control: 'multi-select',
        options: options(['hardwired', 'plug-in']),
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
    id: 'connectivity-smart-charging',
    label: 'Connectivity & Smart Charging',
    facets: [
      {
        id: 'connectivity-interfaces',
        label: 'Interfaces',
        field: 'hardware.connectivity.interfaces',
        control: 'multi-select',
        options: labeled([
          ['ethernet', 'Ethernet'],
          ['bluetooth', 'Bluetooth'],
          ['rs485', 'RS-485'],
          ['can-bus', 'CAN bus'],
          ['powerline-communication', 'Powerline (PLC)'],
        ]),
      },
      {
        id: 'wifi',
        label: 'Wi-Fi',
        field: 'hardware.connectivity.wifi',
        control: 'multi-select',
        options: labeled([
          ['802.11a', '802.11a'],
          ['802.11b', '802.11b'],
          ['802.11g', '802.11g'],
          ['802.11n', 'Wi-Fi 4 (802.11n)'],
          ['802.11ac', 'Wi-Fi 5 (802.11ac)'],
          ['802.11ax', 'Wi-Fi 6 (802.11ax)'],
        ]),
      },
      {
        id: 'cellular-generations',
        label: 'Cellular',
        field: 'hardware.connectivity.cellular.generations',
        control: 'multi-select',
        options: labeled([
          ['2G', '2G'],
          ['3G', '3G'],
          ['4G-LTE', '4G LTE'],
          ['5G', '5G'],
          ['NB-IoT', 'NB-IoT'],
          ['LTE-M', 'LTE-M'],
        ]),
      },
      {
        id: 'smart-charging-features',
        label: 'Smart charging features',
        field: 'software.smartCharging.features',
        control: 'multi-select',
        options: labeled([
          ['local-load-balancing', 'Local load balancing'],
          ['backend-managed-profiles', 'Backend-managed profiles'],
          ['dynamic-pricing', 'Dynamic pricing'],
          ['v2g', 'Vehicle-to-grid (V2G)'],
          ['v2h', 'Vehicle-to-home (V2H)'],
          ['solar-integration', 'Solar integration'],
        ]),
      },
      {
        id: 'offline-charging',
        label: 'Offline charging',
        field: 'software.offlineChargingSupported',
        control: 'toggle',
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
        options: labeled([
          ['rfid', 'RFID card'],
          ['mobile-app', 'Mobile app'],
          ['plug-and-charge-iso15118', 'Plug & Charge (ISO 15118)'],
          ['qr-code', 'QR code'],
          ['pin-code', 'PIN code'],
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
        options: [
          {
            value: 'contactless-card',
            label: 'Contactless (card / phone wallet)',
            matches: ['contactless-card', 'mobile-wallet'],
          },
          ...labeled([
            ['rfid-prepaid', 'Prepaid RFID'],
            ['mobile-app', 'Mobile app'],
            ['plug-and-charge-autocharge', 'Plug & Charge / Autocharge'],
          ]),
        ],
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
]

export interface ProtocolOption {
  name: string
  label: string
  versions?: FacetOption[]
}

/** Protocol names from software.schema.json's protocolName; versions are matched by prefix. */
export const PROTOCOL_OPTIONS: ProtocolOption[] = [
  {
    name: 'OCPP',
    label: 'OCPP',
    versions: labeled([
      ['1.5', '1.5'],
      ['1.6', '1.6'],
      ['2.0.1', '2.0.1'],
      ['2.1', '2.1'],
    ]),
  },
  {
    name: 'ISO15118',
    label: 'ISO 15118',
    versions: labeled([
      ['ISO 15118-2', '-2'],
      ['ISO 15118-20', '-20'],
    ]),
  },
  { name: 'EEBus', label: 'EEBus' },
  { name: 'IEEE2030.5', label: 'IEEE 2030.5' },
  { name: 'Modbus-TCP', label: 'Modbus TCP' },
  { name: 'Modbus-RTU', label: 'Modbus RTU' },
  { name: 'SunSpec', label: 'SunSpec' },
  {
    name: 'MQTT',
    label: 'MQTT',
    versions: labeled([
      ['3.1.1', '3.1.1'],
      ['5.0', '5.0'],
    ]),
  },
  { name: 'REST-API', label: 'REST API' },
  { name: 'SNMP', label: 'SNMP' },
]

export const ALL_FACETS: FacetDefinition[] = FILTER_GROUPS.flatMap((g) => g.facets)
