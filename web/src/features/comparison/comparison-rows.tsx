import type { ComponentType, ReactNode } from 'react'
import { CreditCard, MonitorSmartphone, Plug, ShieldCheck, Tag, Wifi, Zap } from 'lucide-react'

import { formatQuantity, formatValueRange, humanize } from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { badgeGroup, boolBadge } from '@/features/product/spec-badges'

export interface ComparisonRow {
  label: string
  render?: (variant: ChargerVariant) => ReactNode
  /** Marks the row as numeric, driving delta/percent-change annotations against the first
   *  compared variant, colored by whether that change is favorable. */
  numericValue?: (variant: ChargerVariant) => number | undefined
  /** Unit label for the numeric delta annotation, e.g. "kW". */
  unit?: string
  /** Whether a higher or lower numericValue is favorable; defaults to 'higher'. */
  betterDirection?: 'higher' | 'lower'
  /** Comparable scalar used to flag when a non-numeric row differs across compared variants
   *  (e.g. charger type) — highlighted, but without a "better/worse" judgment. */
  diffKey?: (variant: ChargerVariant) => string | number | undefined
  /** Raw (pre-humanize) item list for CSV-style rows — items not shared by every compared
   *  variant are called out as a differing pill. */
  items?: (variant: ChargerVariant) => string[] | undefined
  humanizeItems?: boolean
  /** Label and value share a line instead of stacking — for short values like Yes/No. */
  inline?: boolean
}

export interface ComparisonGroup {
  title: string
  icon: ComponentType<{ className?: string }>
  rows: ComparisonRow[]
}

function humanizedBadges(values?: string[]): ReactNode {
  return badgeGroup(values && values.length > 0 ? values.map(humanize) : undefined)
}

/**
 * Comparable spec groups, rendered one per card in the comparison carousel. Pricing is
 * intentionally not here — it's handled as its own standout footer, not a generic group.
 */
export const comparisonGroups: ComparisonGroup[] = [
  {
    title: 'Charger type',
    icon: Tag,
    rows: [
      { label: 'Manufacturer', render: (v) => v.manufacturer.name },
      { label: 'Product line', render: (v) => v.model.series ?? '—' },
      { label: 'Type', render: (v) => v.model.type, diffKey: (v) => v.model.type },
      { label: 'Level', render: (v) => v.model.level ?? '—' },
      { label: 'Status', render: (v) => (v.model.status ? humanize(v.model.status) : '—') },
      { label: 'Release date', render: (v) => v.model.releaseDate ?? '—' },
    ],
  },
  {
    title: 'Power & electrical',
    icon: Zap,
    rows: [
      {
        label: 'Max output power',
        render: (v) => formatQuantity(v.hardware.electrical?.output?.maxPower) ?? '—',
        numericValue: (v) => v.hardware.electrical?.output?.maxPower?.value,
        unit: 'kW',
      },
      {
        label: 'Min output power',
        render: (v) => formatQuantity(v.hardware.electrical?.output?.minPower) ?? '—',
        numericValue: (v) => v.hardware.electrical?.output?.minPower?.value,
        unit: 'kW',
        // A lower floor means the charger can throttle down further — more flexible, not less.
        betterDirection: 'lower',
      },
      {
        label: 'Input voltage',
        render: (v) => formatValueRange(v.hardware.electrical?.input?.voltage) ?? '—',
        // A regional/compatibility spec, not a "better/worse" axis — just flag when it differs.
        diffKey: (v) => formatValueRange(v.hardware.electrical?.input?.voltage),
      },
      {
        label: 'Max input current',
        render: (v) => formatQuantity(v.hardware.electrical?.input?.maxCurrent) ?? '—',
        numericValue: (v) => v.hardware.electrical?.input?.maxCurrent?.value,
        unit: 'A',
      },
      {
        label: 'Conversion efficiency',
        render: (v) =>
          v.hardware.electrical?.input?.efficiency != null
            ? `${v.hardware.electrical.input.efficiency}%`
            : '—',
        numericValue: (v) => v.hardware.electrical?.input?.efficiency,
      },
      {
        label: 'Simultaneous charging',
        render: (v) =>
          boolBadge(v.hardware.electrical?.output?.simultaneousChargingSupported ?? false),
        inline: true,
      },
    ],
  },
  {
    title: 'Connectors',
    icon: Plug,
    rows: [
      {
        label: 'Connector types',
        render: (v) => humanizedBadges(v.hardware.connectors.map((c) => c.type)),
      },
      {
        label: 'Fastest connector',
        render: (v) => {
          const max = Math.max(...v.hardware.connectors.map((c) => c.maxPower?.value ?? 0))
          return max > 0 ? `${max} kW` : '—'
        },
        numericValue: (v) => Math.max(...v.hardware.connectors.map((c) => c.maxPower?.value ?? 0)),
        unit: 'kW',
      },
      {
        label: 'Plug & Charge (ISO 15118)',
        render: (v) => boolBadge(v.hardware.connectors.some((c) => c.isoPlugAndCharge)),
        inline: true,
      },
    ],
  },
  {
    title: 'User interface',
    icon: MonitorSmartphone,
    rows: [
      {
        label: 'Display',
        render: (v) =>
          v.hardware.userInterface?.display?.type
            ? humanize(v.hardware.userInterface.display.type)
            : '—',
      },
      {
        label: 'Authentication methods',
        items: (v) => v.hardware.userInterface?.authenticationMethods,
        humanizeItems: true,
      },
    ],
  },
  {
    title: 'Payment',
    icon: CreditCard,
    rows: [
      {
        label: 'Supported payment options',
        items: (v) => v.payment?.acceptedMethods,
        humanizeItems: true,
      },
      {
        label: 'Ad-hoc payment',
        render: (v) => boolBadge(v.payment?.adHocPaymentSupported ?? false),
        inline: true,
      },
    ],
  },
  {
    title: 'Software & connectivity',
    icon: Wifi,
    rows: [
      {
        label: 'Protocols',
        items: (v) => v.software.protocols.map((p) => `${p.name} ${p.version}`),
      },
      {
        label: 'Smart charging features',
        render: (v) => humanizedBadges(v.software.smartCharging?.features),
      },
      {
        label: 'Offline charging',
        render: (v) => boolBadge(v.software.offlineChargingSupported ?? false),
        inline: true,
      },
      {
        label: 'Connectivity',
        items: (v) => v.hardware.connectivity?.interfaces,
        humanizeItems: true,
      },
    ],
  },
  {
    title: 'Certifications',
    icon: ShieldCheck,
    rows: [
      {
        label: 'Certifications',
        items: (v) => v.hardware.certifications?.map((c) => c.standard),
      },
    ],
  },
]
