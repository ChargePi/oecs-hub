import { localeFor } from '@/lib/preferences/languages'
import type { UnitSystem } from '@/lib/preferences/types'
import { usePreferencesStore } from '@/stores/preferences-store'

import type { Housing, Pricing, Quantity, RegionalPrice, ValueRange } from './types'
import { convertQuantity, unitLabel } from './units'

function locale(): string {
  return localeFor(usePreferencesStore.getState().preferences.language)
}

export function formatQuantity(q?: Quantity, unitSystem?: UnitSystem): string | undefined {
  if (!q) return undefined
  const shown = unitSystem ? convertQuantity(q, unitSystem) : q
  return `${shown.value} ${unitLabel(shown.unit)}`
}

export function formatValueRange(r?: ValueRange, unitSystem?: UnitSystem): string | undefined {
  if (!r) return undefined
  const convert = (value: number) =>
    unitSystem ? convertQuantity({ value, unit: r.unit }, unitSystem) : { value, unit: r.unit }
  const min = r.min != null ? convert(r.min) : undefined
  const max = r.max != null ? convert(r.max) : undefined
  const nominal = r.nominal != null ? convert(r.nominal) : undefined
  const unit = unitLabel((min ?? max ?? nominal)?.unit ?? r.unit)
  if (min && max) return `${min.value}–${max.value} ${unit}`
  if (nominal) return `${nominal.value} ${unit} (nominal)`
  if (min) return `≥${min.value} ${unit}`
  if (max) return `≤${max.value} ${unit}`
  return undefined
}

export function formatDimensions(
  d?: Housing['dimensions'],
  unitSystem?: UnitSystem,
): string | undefined {
  if (!d) return undefined
  const [height, width, depth] = [d.height, d.width, d.depth].map((value) =>
    unitSystem ? convertQuantity({ value, unit: d.unit }, unitSystem) : { value, unit: d.unit },
  )
  return `${height.value} × ${width.value} × ${depth.value} ${unitLabel(height.unit)} (H × W × D)`
}

/** Converts an ISO 3166-1 alpha-2 country code (e.g. "DE") into its flag emoji, via the
 *  regional-indicator-symbol Unicode trick. Returns undefined for anything that isn't a
 *  2-letter code, rather than emitting garbage glyphs. */
export function countryFlag(code?: string): string | undefined {
  if (!code || code.length !== 2) return undefined
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Resolves an ISO 3166-1 alpha-2 country code (e.g. "CH") to its English name
 *  ("Switzerland"), falling back to the raw code when it isn't a known region. */
export function countryName(code?: string): string | undefined {
  if (!code) return undefined
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** Turns a schema enum value like "backend-managed-profiles" or "CCS2_Combo2" into readable text. */
export function humanize(value: string): string {
  const spaced = value.replace(/[_-]/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Formats a single regional price, e.g. "€2,490 (DE)". */
export function formatRegionalPrice(p: RegionalPrice): string {
  const amount = new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: p.currency,
    maximumFractionDigits: 0,
  }).format(p.value)
  return p.region ? `${amount} (${p.region})` : amount
}

export function sortByPreferredCurrency<T extends { currency: string }>(
  prices: T[],
  currency?: string,
): T[] {
  if (!currency) return prices
  return [...prices].sort(
    (a, b) => Number(b.currency === currency) - Number(a.currency === currency),
  )
}

/** Formats a manufacturer MSRP (pricing.schema.json) as one or more region-labeled amounts. */
export function formatPricing(pricing?: Pricing, currency?: string): string[] | undefined {
  if (!pricing) return undefined
  if (pricing.pricingModel === 'enquiry') return ['On request']
  return (
    pricing.prices && sortByPreferredCurrency(pricing.prices, currency).map(formatRegionalPrice)
  )
}

export interface PriceComparison {
  region?: string
  delta: number
  percent?: number
  currency: string
}

/** Compares a variant's fixed prices against a baseline's, one delta per market — matched by
 *  currency, since cross-currency pairs can't be diffed meaningfully without FX conversion. */
export function comparePricing(
  pricing?: Pricing,
  baseline?: Pricing,
  currency?: string,
): PriceComparison[] | undefined {
  if (pricing?.pricingModel !== 'fixed' || baseline?.pricingModel !== 'fixed') return undefined
  if (!pricing.prices?.length || !baseline.prices?.length) return undefined

  const comparisons = pricing.prices.flatMap((price) => {
    const basePrice = baseline.prices?.find((p) => p.currency === price.currency)
    if (!basePrice) return []
    const delta = price.value - basePrice.value
    const percent = basePrice.value !== 0 ? (delta / basePrice.value) * 100 : undefined
    return [{ region: price.region, delta, percent, currency: price.currency }]
  })

  return comparisons.length > 0 ? sortByPreferredCurrency(comparisons, currency) : undefined
}

/** Formats a +/- percent change, e.g. "+8.0%". */
export function formatPercentDelta(percent: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(percent / 100)
}

/** Formats a +/- currency delta with an optional percent change, e.g. "+$200 (+8.0%)". */
export function formatPriceDelta({ delta, percent, currency }: PriceComparison): string {
  const amount = new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  }).format(delta)
  if (percent == null) return amount
  return `${amount} (${formatPercentDelta(percent)})`
}

/** Formats a +/- numeric delta with an optional unit and percent change, e.g. "+2 kW (+9.5%)". */
export function formatNumericDelta(delta: number, unit?: string, percent?: number): string {
  const amount = new Intl.NumberFormat(locale(), {
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(delta)
  const amountLabel = unit ? `${amount} ${unit}` : amount
  if (percent == null || !Number.isFinite(percent)) return amountLabel
  return `${amountLabel} (${formatPercentDelta(percent)})`
}
