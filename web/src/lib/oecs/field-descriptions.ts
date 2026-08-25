/**
 * Tooltip copy for OECS charger spec fields, hand-maintained against the Go schema — see
 * internal/oecsspec/schema/*.schema.json in the sibling repo for the source of truth. Mirrors the
 * field naming used in ./types.ts.
 *
 * `fieldDescriptions` explains what a *field* (row label) means, keyed by its dotted path off
 * `ChargerVariant`; array-valued fields are suffixed `[]` before descending into item fields
 * (e.g. `hardware.connectors[].type`).
 *
 * `valueDescriptions` explains what a specific *enum value* means, keyed `"<enumName>.<value>"`
 * using the raw (pre-`humanize()`) schema value — use `describeValue(enumName)` to look one up.
 */

export const fieldDescriptions: Record<string, string> = {
  'model.type': 'Fundamental charging technology: AC (Level 1/2), DC fast charging, portable EVSE, or wireless.',

  'hardware.connectors[].type': 'Physical connector/plug standard.',

  'hardware.userInterface.authenticationMethods': 'Ways a driver can authenticate/start a charging session on this charger.',

  'payment.acceptedMethods': 'Ways a driver can pay for a charging session, distinct from how they authenticate/start it.',

  'software.protocols[]': 'A communication protocol implemented by the charger, with its version.',
  'software.smartCharging.features': 'Smart-charging capabilities the charger supports.',

  'hardware.connectivity.interfaces': "Physical network interfaces present, besides Wi-Fi/cellular which are detailed separately.",
}

export const valueDescriptions: Record<string, string> = {
  // connectorType
  'connectorType.Type1_J1772': 'SAE J1772 — the standard single-phase AC connector in North America and Japan.',
  'connectorType.Type2_Mennekes': "IEC 62196 Type 2 (Mennekes) — the standard AC connector in Europe, supports single- and three-phase.",
  'connectorType.Type3A': 'IEC 62196 Type 3A — an older AC connector with built-in shutters, historically used in some European markets.',
  'connectorType.CCS1_Combo1': 'Combined Charging System (Combo 1) — combines a Type 1 AC connector with two DC pins; the DC fast-charging standard in North America.',
  'connectorType.CCS2_Combo2': 'Combined Charging System (Combo 2) — combines a Type 2 AC connector with two DC pins; the DC fast-charging standard in Europe.',
  'connectorType.CHAdeMO': 'A DC fast-charging connector standard developed in Japan, also supports bidirectional (V2G) power flow.',
  'connectorType.GBT_AC': "China's GB/T AC charging connector standard.",
  'connectorType.GBT_DC': "China's GB/T DC fast-charging connector standard.",
  'connectorType.NACS_Tesla': 'North American Charging Standard (formerly Tesla connector) — supports both AC and DC charging through a single compact connector.',
  'connectorType.Domestic_Socket': 'A standard household electrical socket (e.g. Schuko, NEMA), used for slow/portable AC charging.',
  'connectorType.Industrial_IEC60309': 'IEC 60309 industrial plug/socket, commonly used for portable or site-power AC charging.',
  'connectorType.MCS_MegawattChargingSystem': 'Megawatt Charging System — an emerging ultra-high-power DC standard for heavy-duty vehicles.',
  'connectorType.Other': 'A connector type not covered by the standard list.',

  // protocolName
  'protocolName.OCPP': 'Open Charge Point Protocol — the industry-standard protocol for communication between a charge point and a central management system (CSMS).',
  'protocolName.OCPI': 'Open Charge Point Interface — a protocol for roaming and interoperability between charging networks (CPOs) and e-mobility service providers (eMSPs).',
  'protocolName.OSCP': 'Open Smart Charging Protocol — used between a charge point operator and a distribution system operator for grid-load management.',
  'protocolName.ISO15118': 'ISO 15118 — the vehicle-to-grid communication standard enabling Plug & Charge and high-level DC charging control.',
  'protocolName.IEC61851': 'IEC 61851 — the base electrical/control standard for conductive EV charging (defines the AC charging modes and pilot signaling).',
  'protocolName.DIN70121': 'DIN SPEC 70121 — an earlier German standard for DC fast-charging communication, a precursor to ISO 15118.',
  'protocolName.OpenADR': 'Open Automated Demand Response — a standard for utilities/grid operators to signal demand-response events to devices.',
  'protocolName.IEEE2030.5': 'IEEE 2030.5 (Smart Energy Profile) — a protocol for smart grid device communication, used for demand response and distributed energy resources.',
  'protocolName.EEBus': 'EEBus — a European standard for smart-home and smart-grid device communication, including EV charging control.',
  'protocolName.Modbus-TCP': 'Modbus over TCP/IP — a common industrial protocol used for local metering/control integration.',
  'protocolName.Modbus-RTU': 'Modbus over serial (RTU) — a common industrial protocol used for local metering/control integration.',
  'protocolName.SunSpec': 'SunSpec Modbus — a standardized information model for distributed energy resources (solar, storage, EV charging) over Modbus.',
  'protocolName.MQTT': 'A lightweight publish/subscribe messaging protocol, sometimes used for telemetry or local integration.',
  'protocolName.REST-API': 'A local or cloud HTTP REST API exposed by the charger for integration.',
  'protocolName.SNMP': 'Simple Network Management Protocol — used for network device monitoring/management.',
  'protocolName.other': 'A protocol not covered by the standard list; see the accompanying name for details.',

  // chargerType (model.type)
  'chargerType.AC': 'Alternating current charging — Level 1/2 speeds, using the vehicle’s onboard charger.',
  'chargerType.DC': 'Direct current fast charging — power conversion happens in the charger, bypassing the onboard charger for much higher speeds.',
  'chargerType.portable-evse': 'A portable, movable EVSE rather than a fixed installation.',
  'chargerType.wireless': 'Inductive/wireless charging — no physical connector.',

  // paymentMethod
  'paymentMethod.contactless-card': 'Tap-to-pay bank/credit card via NFC.',
  'paymentMethod.mobile-wallet': 'Mobile wallet payment, e.g. Apple Pay or Google Pay.',
  'paymentMethod.rfid-prepaid': 'A prepaid RFID card or fob tied to an account/balance.',
  'paymentMethod.mobile-app': "Payment through the operator's or manufacturer's mobile app.",
  'paymentMethod.plug-and-charge-autocharge': 'Automatic billing on connection via ISO 15118 Plug & Charge or Autocharge, no separate payment action needed.',
  'paymentMethod.backend-invoicing': 'Billed after the fact via account/backend invoicing, e.g. fleet or subscription billing.',
  'paymentMethod.free-of-charge': 'No payment required to charge.',

  // authenticationMethod (hardware.userInterface.authenticationMethods)
  'authenticationMethod.rfid': 'RFID card or fob tap to authenticate.',
  'authenticationMethod.mobile-app': 'Start/authenticate a session via a mobile app.',
  'authenticationMethod.plug-and-charge-iso15118': 'Automatic authentication on connection via ISO 15118 Plug & Charge — no separate action needed.',
  'authenticationMethod.credit-card': 'Authenticate by tapping/inserting a credit or debit card.',
  'authenticationMethod.qr-code': 'Scan a QR code on the charger to start a session.',
  'authenticationMethod.ocpp-remote-start': 'Session started remotely by a backend via OCPP RemoteStartTransaction.',
  'authenticationMethod.pin-code': 'Authenticate by entering a PIN code.',
  'authenticationMethod.autostart-free-vend': 'Charging starts automatically on connection, no authentication required (free vend).',

  // connectivityInterface (hardware.connectivity.interfaces)
  'connectivityInterface.ethernet': 'Wired Ethernet network connection.',
  'connectivityInterface.bluetooth': 'Bluetooth wireless connection, typically for local configuration/pairing.',
  'connectivityInterface.rs485': 'RS-485 serial interface, commonly used for Modbus or other local industrial integration.',
  'connectivityInterface.can-bus': 'CAN bus interface, used for local device/vehicle communication.',
  'connectivityInterface.powerline-communication': 'Power-line communication (PLC) per ISO 15118 / IEC 61851, used for high-level communication over the charging cable’s CP/PP lines.',

  // smartChargingFeature (software.smartCharging.features)
  'smartChargingFeature.local-load-balancing': 'Balances power across connectors/chargers locally, without backend involvement.',
  'smartChargingFeature.backend-managed-profiles': 'Can accept and enforce charging profiles/schedules pushed by a backend, e.g. OCPP SetChargingProfile.',
  'smartChargingFeature.dynamic-pricing': 'Can adjust charging behavior in response to dynamic electricity pricing.',
  'smartChargingFeature.v2g': 'Vehicle-to-grid — the vehicle can discharge power back into the grid.',
  'smartChargingFeature.v2h': 'Vehicle-to-home — the vehicle can discharge power to power a home/building.',
  'smartChargingFeature.solar-integration': 'Can coordinate charging with on-site solar generation.',
}

/** Curried lookup into `valueDescriptions` for a given enum, e.g. `describeValue('connectorType')('CCS2_Combo2')`. */
export function describeValue(enumKey: string): (value: string) => string | undefined {
  return (value) => valueDescriptions[`${enumKey}.${value}`]
}
