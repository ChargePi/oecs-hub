import type { ChargerVariant, Manufacturer } from './types'

/** One definition per manufacturer, referenced by every variant below. */
const MANUFACTURERS = {
  ionwave: {
    id: 'ionwave',
    name: 'Ionwave Charging Systems',
    country: 'NL',
    logoUrl: '/images/placeholder-charger.svg',
    contact: {
      name: 'Ionwave OEM Support',
      email: 'oem-support@ionwave.example',
      phone: '+31-20-555-0142',
      website: 'https://ionwave.example',
    },
  },
  voltgrid: {
    id: 'voltgrid',
    name: 'VoltGrid GmbH',
    country: 'DE',
    contact: {
      name: 'VoltGrid Technical Support',
      email: 'support@voltgrid.example',
      phone: '+49-30-1234567',
      website: 'https://voltgrid.example',
    },
  },
  nordvolt: {
    id: 'nordvolt',
    name: 'Nordvolt Charging AB',
    country: 'SE',
    contact: {
      name: 'Nordvolt Partner Desk',
      email: 'partners@nordvolt.example',
      website: 'https://nordvolt.example',
    },
  },
  ampera: {
    id: 'ampera',
    name: 'Ampera Systems',
    country: 'US',
    contact: {
      name: 'Ampera Sales',
      email: 'sales@amperasystems.example',
      phone: '+1-415-555-0198',
      website: 'https://amperasystems.example',
    },
  },
} satisfies Record<string, Manufacturer>

/**
 * Fixture data standing in for a real oecs-registry backend. Shape and enum values are faithful
 * to the real OECS charger.schema.json v2.0.0 (see internal/oecsspec/schema in this repo) —
 * swapping in a live API later only touches src/lib/registry, never this data's shape.
 */
export const chargerVariants: ChargerVariant[] = [
  // --- Ionwave Charging Systems (NL) — "Rapid" DC series ---
  {
    id: 'ionwave-rapid-75',
    ratings: [
      { categoryName: 'reliability', average: 4.5, count: 22 },
      { categoryName: 'support', average: 4.1, count: 18 },
      { categoryName: 'design', average: 4.7, count: 20 },
      { categoryName: 'ease_of_use', average: 4.3, count: 19 },
    ],
    manufacturer: MANUFACTURERS.ionwave,
    model: {
      name: 'IW-Rapid75',
      partNumber: 'IW-R75-SGL',
      series: 'Rapid',
      status: 'active',
      type: 'DC',
      level: 'DC Fast',
      releaseDate: '2024-11-01',
    },
    hardware: {
      housing: {
        formFactor: 'freestanding',
        coolingMethod: 'forced-air',
        weight: { value: 320, unit: 'kg' },
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { nominal: 400, unit: 'V' },
          maxCurrent: { value: 125, unit: 'A' },
          efficiency: 94,
        },
        output: {
          minPower: { value: 5, unit: 'kW' },
          maxPower: { value: 75, unit: 'kW' },
          simultaneousChargingSupported: false,
        },
      },
      connectors: [
        {
          label: 'CCS2 outlet',
          type: 'CCS2_Combo2',
          currentType: 'DC',
          maxPower: { value: 75, unit: 'kW' },
          cable: { attached: true, cooling: 'liquid' },
          isoPlugAndCharge: true,
        },
      ],
      userInterface: {
        display: { type: 'color-lcd' },
        authenticationMethods: ['rfid', 'mobile-app', 'credit-card'],
      },
      certifications: [{ type: 'safety', standard: 'IEC 61851-23', issuingBody: 'TUV Rheinland' }],
    },
    software: {
      firmware: { currentVersion: '2.1.0', updateMethods: ['ota-ocpp'] },
      protocols: [
        {
          name: 'OCPP',
          version: '2.0.1',
          profiles: ['Core', 'SmartCharging', 'FirmwareManagement'],
        },
      ],
      smartCharging: { features: ['local-load-balancing', 'backend-managed-profiles'] },
      offlineChargingSupported: true,
    },
    payment: { acceptedMethods: ['contactless-card', 'mobile-app'], adHocPaymentSupported: true },
    pricing: {
      pricingModel: 'enquiry',
      notes: 'Contact regional sales for a project-specific quote.',
    },
  },
  {
    id: 'ionwave-rapid-150',
    ratings: [
      { categoryName: 'reliability', average: 3.9, count: 7 },
      { categoryName: 'ease_of_use', average: 4.2, count: 6 },
    ],
    manufacturer: MANUFACTURERS.ionwave,
    model: {
      name: 'IW-Rapid150',
      partNumber: 'IW-R150-DUAL',
      series: 'Rapid',
      hardwareRevision: 'B',
      releaseDate: '2025-05-01',
      status: 'active',
      type: 'DC',
      level: 'DC Fast',
      brandingOptions: ['white-label', 'custom-faceplate', 'customizable-ui', 'custom-led-color'],
      productImageUrl: '/images/placeholder-charger.svg',
    },
    hardware: {
      housing: {
        formFactor: 'freestanding',
        material: 'powder-coated-steel',
        ingressProtection: 'IP55',
        impactRating: 'IK10',
        dimensions: { height: 1850, width: 900, depth: 700, unit: 'mm' },
        weight: { value: 480, unit: 'kg' },
        coolingMethod: 'forced-air',
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { min: 342, nominal: 400, max: 440, unit: 'V' },
          maxCurrent: { value: 240, unit: 'A' },
          efficiency: 95,
        },
        output: {
          minPower: { value: 5, unit: 'kW' },
          maxPower: { value: 150, unit: 'kW' },
          simultaneousChargingSupported: true,
          dynamicPowerSharing: true,
        },
        protection: {
          surgeProtection: 'Type 1+2',
          overVoltageCategory: 'III',
          features: ['overcurrent', 'insulation-monitoring', 'ground-fault'],
        },
      },
      connectors: [
        {
          label: 'CCS2 outlet A',
          type: 'CCS2_Combo2',
          currentType: 'DC',
          maxPower: { value: 150, unit: 'kW' },
          cable: {
            attached: true,
            length: { value: 4.5, unit: 'm' },
            retractable: true,
            cooling: 'liquid',
          },
          isoPlugAndCharge: true,
        },
        {
          label: 'CHAdeMO outlet B',
          type: 'CHAdeMO',
          currentType: 'DC',
          maxPower: { value: 62.5, unit: 'kW' },
          cable: { attached: true, cooling: 'liquid' },
          bidirectional: true,
        },
      ],
      userInterface: {
        display: { type: 'touchscreen', size: { value: 38.1, unit: 'cm' } },
        authenticationMethods: ['rfid', 'mobile-app', 'credit-card', 'plug-and-charge-iso15118'],
      },
      connectivity: {
        interfaces: ['ethernet', 'can-bus'],
        cellular: { generations: ['4G-LTE', '5G'], simSlots: 2, esim: true },
      },
      meter: { integrated: true, accuracyClass: 'MID_B', certification: 'Eichrecht' },
      certifications: [
        {
          type: 'safety',
          standard: 'IEC 61851-23',
          certificateNumber: 'DEKRA-2025-33110',
          issuingBody: 'DEKRA',
          jurisdiction: 'EU',
          documentUrl: 'https://ionwave.example/certs/dekra-2025-33110.pdf',
        },
      ],
    },
    software: {
      firmware: { currentVersion: '4.1.0', updateMethods: ['ota-ocpp', 'ota-vendor-cloud', 'usb'] },
      protocols: [
        {
          name: 'OCPP',
          version: '2.0.1',
          securityProfile: '3 - TLS with Client Certificates',
          profiles: [
            'Core',
            'SmartCharging',
            'FirmwareManagement',
            'ISO15118Support',
            'TariffAndCost',
          ],
        },
        {
          name: 'ISO15118',
          version: 'ISO 15118-20:2022',
          profiles: ['Plug&Charge', 'Bidirectional Power Transfer'],
        },
      ],
      smartCharging: {
        features: ['local-load-balancing', 'backend-managed-profiles', 'dynamic-pricing', 'v2g'],
      },
      offlineChargingSupported: true,
      operatingSystem: 'Linux 6.1 (Yocto)',
    },
    payment: {
      acceptedMethods: [
        'contactless-card',
        'mobile-wallet',
        'mobile-app',
        'plug-and-charge-autocharge',
      ],
      adHocPaymentSupported: true,
      terminal: {
        manufacturer: 'Castles Technology',
        model: 'VEGA3000',
        cardReaderTypes: ['contactless-emv', 'chip-pin'],
      },
    },
    pricing: {
      pricingModel: 'enquiry',
      notes:
        'Commercial DC fast-charging hardware; contact regional sales for a project-specific quote based on site requirements and volume.',
    },
    metadata: {
      sources: [
        {
          type: 'technical-specification',
          title: 'IW-Rapid150 Technical Specification',
          url: 'https://ionwave.example/docs/iw-rapid150-techspec.pdf',
          publisher: 'Ionwave Charging Systems',
          publishedDate: '2025-04-10',
        },
        {
          type: 'installation-manual',
          title: 'IW-Rapid150 Installation Manual',
          url: 'https://ionwave.example/docs/iw-rapid150-install.pdf',
          publisher: 'Ionwave Charging Systems',
        },
        {
          type: 'conformance-test-report',
          title: 'OCA OCPP 2.0.1 Certification Report',
          url: 'https://ionwave.example/docs/oca-ocpp201-iw-rapid150.pdf',
          publisher: 'Open Charge Alliance',
        },
      ],
    },
  },
  {
    id: 'ionwave-rapid-350',
    ratings: [],
    manufacturer: MANUFACTURERS.ionwave,
    model: {
      name: 'IW-Rapid350',
      partNumber: 'IW-R350-DUAL',
      series: 'Rapid',
      status: 'active',
      type: 'DC',
      level: 'DC Ultra-Fast',
      releaseDate: '2026-01-15',
    },
    hardware: {
      housing: {
        formFactor: 'freestanding',
        coolingMethod: 'liquid',
        weight: { value: 640, unit: 'kg' },
        ingressProtection: 'IP55',
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { nominal: 400, unit: 'V' },
          maxCurrent: { value: 500, unit: 'A' },
          efficiency: 96,
        },
        output: {
          minPower: { value: 10, unit: 'kW' },
          maxPower: { value: 350, unit: 'kW' },
          simultaneousChargingSupported: true,
          dynamicPowerSharing: true,
        },
      },
      connectors: [
        {
          label: 'CCS2 outlet A',
          type: 'CCS2_Combo2',
          currentType: 'DC',
          maxPower: { value: 350, unit: 'kW' },
          cable: { attached: true, retractable: true, cooling: 'liquid' },
          isoPlugAndCharge: true,
        },
        {
          label: 'CCS2 outlet B',
          type: 'CCS2_Combo2',
          currentType: 'DC',
          maxPower: { value: 350, unit: 'kW' },
          cable: { attached: true, retractable: true, cooling: 'liquid' },
          isoPlugAndCharge: true,
        },
      ],
      userInterface: {
        display: { type: 'touchscreen', size: { value: 43.2, unit: 'cm' } },
        authenticationMethods: ['rfid', 'mobile-app', 'credit-card', 'plug-and-charge-iso15118'],
      },
      certifications: [
        { type: 'safety', standard: 'IEC 61851-23', issuingBody: 'DEKRA', jurisdiction: 'EU' },
      ],
    },
    software: {
      firmware: { currentVersion: '4.3.0', updateMethods: ['ota-ocpp', 'ota-vendor-cloud'] },
      protocols: [
        { name: 'OCPP', version: '2.0.1', profiles: ['Core', 'SmartCharging', 'ISO15118Support'] },
        { name: 'ISO15118', version: 'ISO 15118-20:2022', profiles: ['Plug&Charge'] },
      ],
      smartCharging: { features: ['backend-managed-profiles', 'dynamic-pricing', 'v2g'] },
      offlineChargingSupported: true,
    },
    payment: {
      acceptedMethods: ['contactless-card', 'mobile-wallet', 'plug-and-charge-autocharge'],
      adHocPaymentSupported: true,
    },
    pricing: {
      pricingModel: 'enquiry',
      notes: 'Contact regional sales for a project-specific quote.',
    },
  },

  // --- VoltGrid GmbH (DE) — "Home" AC series ---
  {
    id: 'voltgrid-home-11',
    ratings: [
      { categoryName: 'reliability', average: 4.0, count: 31 },
      { categoryName: 'support', average: 3.4, count: 27 },
      { categoryName: 'design', average: 4.4, count: 29 },
      { categoryName: 'ease_of_use', average: 4.6, count: 30 },
    ],
    manufacturer: MANUFACTURERS.voltgrid,
    model: {
      name: 'VG-Home11',
      partNumber: 'VG-H11-1P-T2',
      series: 'Home',
      status: 'active',
      type: 'AC',
      level: 'Level 2',
      releaseDate: '2024-03-15',
    },
    hardware: {
      housing: {
        formFactor: 'wall-mounted',
        material: 'aluminum',
        ingressProtection: 'IP54',
        weight: { value: 4.2, unit: 'kg' },
        coolingMethod: 'passive',
      },
      electrical: {
        input: {
          phases: 1,
          voltage: { nominal: 230, unit: 'V' },
          maxCurrent: { value: 16, unit: 'A' },
          efficiency: 97,
        },
        output: { minPower: { value: 1.4, unit: 'kW' }, maxPower: { value: 11, unit: 'kW' } },
      },
      connectors: [
        {
          label: 'Connector 1',
          type: 'Type2_Mennekes',
          currentType: 'AC',
          phases: 1,
          maxPower: { value: 11, unit: 'kW' },
          cable: { attached: true, length: { value: 5, unit: 'm' } },
        },
      ],
      userInterface: {
        display: { type: 'led-segment' },
        authenticationMethods: ['rfid', 'mobile-app'],
      },
      meter: {
        integrated: true,
        accuracyClass: 'MID_B',
        certification: 'MID (2014/32/EU)',
      },
      certifications: [
        {
          type: 'safety',
          standard: 'IEC 61851-1',
          issuingBody: 'TUV Rheinland',
          jurisdiction: 'EU',
        },
      ],
    },
    software: {
      firmware: { currentVersion: '2.4.1', updateMethods: ['ota-ocpp'] },
      protocols: [{ name: 'OCPP', version: '1.6', profiles: ['Core', 'SmartCharging'] }],
      smartCharging: { features: ['solar-integration'] },
      offlineChargingSupported: true,
    },
    payment: { acceptedMethods: ['mobile-app', 'rfid-prepaid'], adHocPaymentSupported: false },
    pricing: {
      pricingModel: 'fixed',
      prices: [{ region: 'DE', value: 1690, currency: 'EUR' }],
    },
  },
  {
    id: 'voltgrid-home-22',
    ratings: [],
    manufacturer: MANUFACTURERS.voltgrid,
    model: {
      name: 'VG-Home22',
      partNumber: 'VG-H22-3P-T2',
      series: 'Home',
      hardwareRevision: 'C',
      releaseDate: '2024-03-15',
      status: 'active',
      type: 'AC',
      level: 'Level 2',
      brandingOptions: ['custom-faceplate', 'customizable-ui'],
      productImageUrl: '/images/placeholder-charger.svg',
    },
    hardware: {
      housing: {
        formFactor: 'wall-mounted',
        material: 'aluminum',
        ingressProtection: 'IP54',
        impactRating: 'IK08',
        dimensions: { height: 420, width: 250, depth: 140, unit: 'mm' },
        weight: { value: 4.8, unit: 'kg' },
        coolingMethod: 'passive',
        noiseLevel: { value: 25, unit: 'dBA' },
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { min: 207, nominal: 230, max: 253, unit: 'V' },
          maxCurrent: { value: 32, unit: 'A' },
          efficiency: 97.5,
          connectionType: 'hardwired',
        },
        output: { minPower: { value: 1.4, unit: 'kW' }, maxPower: { value: 22, unit: 'kW' } },
        protection: {
          surgeProtection: 'Type 2',
          overVoltageCategory: 'III',
          features: ['overcurrent', 'ground-fault', 'over-temperature'],
        },
      },
      connectors: [
        {
          label: 'Connector 1',
          type: 'Type2_Mennekes',
          currentType: 'AC',
          phases: 3,
          ratedCurrent: { value: 32, unit: 'A' },
          maxPower: { value: 22, unit: 'kW' },
          cable: { attached: true, length: { value: 5, unit: 'm' } },
          connectorLock: true,
        },
      ],
      userInterface: {
        display: { type: 'led-segment' },
        authenticationMethods: ['rfid', 'mobile-app', 'ocpp-remote-start'],
        languageSupport: ['en', 'de', 'fr'],
      },
      connectivity: {
        interfaces: ['ethernet', 'bluetooth'],
        wifi: ['802.11n', '802.11ac'],
        cellular: { generations: ['4G-LTE'], simSlots: 1, esim: false },
      },
      meter: {
        integrated: true,
        accuracyClass: 'MID_B',
        certification: 'MID (2014/32/EU)',
      },
      certifications: [
        {
          type: 'safety',
          standard: 'IEC 61851-1',
          certificateNumber: 'TUV-2024-88421',
          issuingBody: 'TUV Rheinland',
          jurisdiction: 'EU',
          documentUrl: 'https://voltgrid.example/certs/tuv-2024-88421.pdf',
        },
        { type: 'emc', standard: 'EN 61000-6-3', issuingBody: 'TUV Rheinland', jurisdiction: 'EU' },
      ],
    },
    software: {
      firmware: { currentVersion: '2.4.1', updateMethods: ['ota-ocpp', 'ota-vendor-cloud'] },
      protocols: [
        {
          name: 'OCPP',
          version: '1.6',
          securityProfile: '3 - TLS with Client Certificates',
          profiles: ['Core', 'FirmwareManagement', 'RemoteTrigger', 'SmartCharging', 'Reservation'],
        },
        { name: 'OCPP', version: '2.0.1', profiles: ['Core', 'SmartCharging', 'ISO15118Support'] },
        {
          name: 'ISO15118',
          version: 'ISO 15118-2:2014',
          profiles: ['Plug&Charge'],
          notes: 'PnC available via optional firmware add-on.',
        },
      ],
      smartCharging: {
        features: [
          'local-load-balancing',
          'backend-managed-profiles',
          'dynamic-pricing',
          'solar-integration',
        ],
      },
      offlineChargingSupported: true,
      operatingSystem: 'Linux 5.10 (Yocto)',
    },
    payment: {
      acceptedMethods: ['mobile-app', 'rfid-prepaid'],
      adHocPaymentSupported: false,
    },
    pricing: {
      pricingModel: 'fixed',
      prices: [
        { region: 'DE', value: 2490, currency: 'EUR' },
        { region: 'US', value: 2690, currency: 'USD' },
      ],
    },
    metadata: {
      sources: [
        {
          type: 'datasheet',
          title: 'VG-Home22 Product Datasheet',
          url: 'https://voltgrid.example/docs/vg-home22-datasheet.pdf',
          publisher: 'VoltGrid GmbH',
          publishedDate: '2024-02-01',
        },
        {
          type: 'technical-specification',
          title: 'VG-Home22 Installation & Technical Manual',
          url: 'https://voltgrid.example/docs/vg-home22-technical-manual.pdf',
          publisher: 'VoltGrid GmbH',
          publishedDate: '2024-03-01',
        },
      ],
    },
  },

  // --- VoltGrid GmbH (DE) — "Pro" commercial AC series ---
  {
    id: 'voltgrid-pro-22-dual',
    ratings: [
      { categoryName: 'reliability', average: 4.8, count: 14 },
      { categoryName: 'support', average: 4.6, count: 12 },
      { categoryName: 'design', average: 4.9, count: 13 },
      { categoryName: 'ease_of_use', average: 4.7, count: 13 },
    ],
    manufacturer: MANUFACTURERS.voltgrid,
    model: {
      name: 'VG-Pro22-Dual',
      partNumber: 'VG-P22-3P-T2x2',
      series: 'Pro',
      status: 'active',
      type: 'AC',
      level: 'Level 2',
      releaseDate: '2025-02-01',
    },
    hardware: {
      housing: {
        formFactor: 'pole-mounted',
        material: 'stainless-steel',
        ingressProtection: 'IP55',
        coolingMethod: 'passive',
        weight: { value: 38, unit: 'kg' },
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { nominal: 400, unit: 'V' },
          maxCurrent: { value: 63, unit: 'A' },
          efficiency: 97,
        },
        output: {
          minPower: { value: 1.4, unit: 'kW' },
          maxPower: { value: 22, unit: 'kW' },
          simultaneousChargingSupported: true,
          dynamicPowerSharing: true,
        },
      },
      connectors: [
        {
          label: 'Connector 1',
          type: 'Type2_Mennekes',
          currentType: 'AC',
          phases: 3,
          maxPower: { value: 22, unit: 'kW' },
          cable: { attached: false },
        },
        {
          label: 'Connector 2',
          type: 'Type2_Mennekes',
          currentType: 'AC',
          phases: 3,
          maxPower: { value: 22, unit: 'kW' },
          cable: { attached: false },
        },
      ],
      userInterface: {
        display: { type: 'color-lcd' },
        authenticationMethods: ['rfid', 'mobile-app', 'credit-card'],
      },
      meter: { integrated: true, accuracyClass: 'MID_B', certification: 'Eichrecht' },
    },
    software: {
      firmware: { currentVersion: '3.0.2', updateMethods: ['ota-ocpp'] },
      protocols: [
        { name: 'OCPP', version: '2.0.1', profiles: ['Core', 'SmartCharging', 'Reservation'] },
      ],
      smartCharging: { features: ['local-load-balancing', 'dynamic-pricing'] },
      offlineChargingSupported: false,
    },
    payment: {
      acceptedMethods: ['contactless-card', 'mobile-app'],
      adHocPaymentSupported: true,
    },
    pricing: {
      pricingModel: 'fixed',
      prices: [{ region: 'DE', value: 3490, currency: 'EUR' }],
    },
  },

  // --- Nordvolt Charging AB (SE) — "Nova" DC ultra-fast series ---
  {
    id: 'nordvolt-nova-200',
    ratings: [],
    manufacturer: MANUFACTURERS.nordvolt,
    model: {
      name: 'NV-Nova200',
      partNumber: 'NV-N200-SGL',
      series: 'Nova',
      status: 'active',
      type: 'DC',
      level: 'DC Ultra-Fast',
      releaseDate: '2025-09-01',
      productImageUrl: '/images/placeholder-charger.svg',
    },
    hardware: {
      housing: {
        formFactor: 'freestanding',
        material: 'aluminum',
        coolingMethod: 'liquid',
        ingressProtection: 'IP54',
        weight: { value: 410, unit: 'kg' },
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { nominal: 400, unit: 'V' },
          maxCurrent: { value: 320, unit: 'A' },
          efficiency: 96.5,
        },
        output: { minPower: { value: 10, unit: 'kW' }, maxPower: { value: 200, unit: 'kW' } },
      },
      connectors: [
        {
          label: 'CCS2 outlet',
          type: 'CCS2_Combo2',
          currentType: 'DC',
          maxPower: { value: 200, unit: 'kW' },
          cable: { attached: true, retractable: true, cooling: 'liquid' },
          isoPlugAndCharge: true,
          bidirectional: true,
        },
      ],
      userInterface: {
        display: { type: 'touchscreen' },
        authenticationMethods: ['rfid', 'mobile-app', 'credit-card', 'plug-and-charge-iso15118'],
        accessibilityFeatures: ['audio-guidance', 'wheelchair-accessible-clearance'],
      },
      certifications: [
        { type: 'safety', standard: 'IEC 61851-23', issuingBody: 'RISE', jurisdiction: 'EU' },
      ],
    },
    software: {
      firmware: { currentVersion: '1.8.0', updateMethods: ['ota-ocpp', 'ota-vendor-cloud'] },
      protocols: [
        { name: 'OCPP', version: '2.0.1', profiles: ['Core', 'SmartCharging', 'ISO15118Support'] },
        {
          name: 'ISO15118',
          version: 'ISO 15118-20:2022',
          profiles: ['Plug&Charge', 'Bidirectional Power Transfer'],
        },
      ],
      smartCharging: { features: ['backend-managed-profiles', 'v2g', 'dynamic-pricing'] },
      offlineChargingSupported: true,
    },
    payment: {
      acceptedMethods: ['contactless-card', 'mobile-wallet', 'plug-and-charge-autocharge'],
      adHocPaymentSupported: true,
      terminal: {
        manufacturer: 'Ingenico',
        model: 'Lane/5000',
        cardReaderTypes: ['contactless-emv', 'chip-pin'],
      },
    },
    pricing: {
      pricingModel: 'enquiry',
      notes: 'Contact regional sales for a project-specific quote.',
    },
  },
  {
    id: 'nordvolt-nova-400',
    ratings: [
      { categoryName: 'reliability', average: 4.2, count: 9 },
      { categoryName: 'design', average: 4.0, count: 8 },
      { categoryName: 'ease_of_use', average: 3.8, count: 8 },
    ],
    manufacturer: MANUFACTURERS.nordvolt,
    model: {
      name: 'NV-Nova400',
      partNumber: 'NV-N400-DUAL',
      series: 'Nova',
      status: 'active',
      type: 'DC',
      level: 'DC Ultra-Fast',
      releaseDate: '2026-02-01',
    },
    hardware: {
      housing: {
        formFactor: 'freestanding',
        material: 'aluminum',
        coolingMethod: 'liquid',
        ingressProtection: 'IP55',
        weight: { value: 690, unit: 'kg' },
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { nominal: 400, unit: 'V' },
          maxCurrent: { value: 580, unit: 'A' },
          efficiency: 97,
        },
        output: {
          minPower: { value: 10, unit: 'kW' },
          maxPower: { value: 400, unit: 'kW' },
          simultaneousChargingSupported: true,
          dynamicPowerSharing: true,
        },
      },
      connectors: [
        {
          label: 'CCS2 outlet A',
          type: 'CCS2_Combo2',
          currentType: 'DC',
          maxPower: { value: 400, unit: 'kW' },
          cable: { attached: true, retractable: true, cooling: 'liquid' },
          isoPlugAndCharge: true,
          bidirectional: true,
        },
        {
          label: 'MCS outlet B',
          type: 'MCS_MegawattChargingSystem',
          currentType: 'DC',
          maxPower: { value: 400, unit: 'kW' },
          cable: { attached: true, cooling: 'liquid' },
        },
      ],
      userInterface: {
        display: { type: 'touchscreen' },
        authenticationMethods: ['rfid', 'mobile-app', 'credit-card', 'plug-and-charge-iso15118'],
      },
      certifications: [
        { type: 'safety', standard: 'IEC 61851-23', issuingBody: 'RISE', jurisdiction: 'EU' },
      ],
    },
    software: {
      firmware: { currentVersion: '1.2.0', updateMethods: ['ota-ocpp', 'ota-vendor-cloud'] },
      protocols: [
        { name: 'OCPP', version: '2.0.1', profiles: ['Core', 'SmartCharging', 'ISO15118Support'] },
      ],
      smartCharging: { features: ['backend-managed-profiles', 'v2g'] },
      offlineChargingSupported: true,
    },
    payment: {
      acceptedMethods: ['contactless-card', 'mobile-wallet', 'plug-and-charge-autocharge'],
      adHocPaymentSupported: true,
    },
    pricing: {
      pricingModel: 'enquiry',
      notes: 'Contact regional sales for a project-specific quote.',
    },
  },

  // --- Ampera Systems (US) — "Flex" portable/compact series ---
  {
    id: 'ampera-flex-7',
    ratings: [],
    manufacturer: MANUFACTURERS.ampera,
    model: {
      name: 'AM-Flex7',
      partNumber: 'AM-F7-PORT',
      series: 'Flex',
      status: 'active',
      type: 'portable-evse',
      level: 'Level 1',
      releaseDate: '2024-08-01',
      productImageUrl: '/images/placeholder-charger.svg',
    },
    hardware: {
      housing: {
        formFactor: 'portable',
        material: 'abs-plastic',
        ingressProtection: 'IP65',
        weight: { value: 2.1, unit: 'kg' },
        coolingMethod: 'passive',
      },
      electrical: {
        input: {
          phases: 1,
          voltage: { nominal: 120, unit: 'V' },
          maxCurrent: { value: 32, unit: 'A' },
          connectionType: 'plug-in',
        },
        output: { minPower: { value: 1.4, unit: 'kW' }, maxPower: { value: 7.7, unit: 'kW' } },
      },
      connectors: [
        {
          label: 'Connector 1',
          type: 'NACS_Tesla',
          currentType: 'AC',
          phases: 1,
          maxPower: { value: 7.7, unit: 'kW' },
          cable: { attached: true, length: { value: 7.5, unit: 'm' } },
        },
      ],
      userInterface: { display: { type: 'led-indicator' }, authenticationMethods: ['mobile-app'] },
    },
    software: {
      firmware: { currentVersion: '1.4.2', updateMethods: ['ota-vendor-cloud'] },
      protocols: [{ name: 'REST-API', version: '1.0', transport: ['https/json'] }],
      offlineChargingSupported: true,
    },
    payment: { acceptedMethods: ['free-of-charge'], adHocPaymentSupported: false },
    pricing: {
      pricingModel: 'fixed',
      prices: [{ region: 'US', value: 399, currency: 'USD' }],
    },
  },
  {
    id: 'ampera-flex-50',
    ratings: [
      { categoryName: 'reliability', average: 3.1, count: 5 },
      { categoryName: 'support', average: 2.8, count: 5 },
      { categoryName: 'design', average: 3.6, count: 4 },
      { categoryName: 'ease_of_use', average: 3.3, count: 4 },
    ],
    manufacturer: MANUFACTURERS.ampera,
    model: {
      name: 'AM-Flex50',
      partNumber: 'AM-F50-CAB',
      series: 'Flex',
      status: 'active',
      type: 'DC',
      level: 'DC Fast',
      releaseDate: '2025-06-01',
    },
    hardware: {
      housing: {
        formFactor: 'cabinet',
        material: 'polycarbonate',
        ingressProtection: 'IP54',
        weight: { value: 180, unit: 'kg' },
        coolingMethod: 'forced-air',
      },
      electrical: {
        input: {
          phases: 3,
          voltage: { nominal: 208, unit: 'V' },
          maxCurrent: { value: 150, unit: 'A' },
          efficiency: 93,
        },
        output: { minPower: { value: 5, unit: 'kW' }, maxPower: { value: 50, unit: 'kW' } },
      },
      connectors: [
        {
          label: 'CCS1 outlet',
          type: 'CCS1_Combo1',
          currentType: 'DC',
          maxPower: { value: 50, unit: 'kW' },
          cable: { attached: true, cooling: 'forced-air' },
        },
      ],
      userInterface: {
        display: { type: 'monochrome-lcd' },
        authenticationMethods: ['rfid', 'credit-card'],
      },
    },
    software: {
      firmware: { currentVersion: '2.0.1', updateMethods: ['ota-ocpp'] },
      protocols: [{ name: 'OCPP', version: '1.6', profiles: ['Core', 'SmartCharging'] }],
      offlineChargingSupported: false,
    },
    payment: { acceptedMethods: ['contactless-card', 'mobile-app'], adHocPaymentSupported: true },
    pricing: {
      pricingModel: 'enquiry',
      notes: 'Contact regional sales for a project-specific quote.',
    },
  },
]
