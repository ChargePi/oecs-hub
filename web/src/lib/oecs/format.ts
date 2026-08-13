import type { Pricing, Quantity, RegionalPrice, ValueRange } from './types'

export function formatQuantity(q?: Quantity): string | undefined {
  if (!q) return undefined
  return `${q.value} ${q.unit}`
}

export function formatValueRange(r?: ValueRange): string | undefined {
  if (!r) return undefined
  if (r.min != null && r.max != null) return `${r.min}–${r.max} ${r.unit}`
  if (r.nominal != null) return `${r.nominal} ${r.unit} (nominal)`
  if (r.min != null) return `≥${r.min} ${r.unit}`
  if (r.max != null) return `≤${r.max} ${r.unit}`
  return undefined
}

/** Converts an ISO 3166-1 alpha-2 country code (e.g. "DE") into its flag emoji, via the
 *  regional-indicator-symbol Unicode trick. Returns undefined for anything that isn't a
 *  2-letter code, rather than emitting garbage glyphs. */
export function countryFlag(code?: string): string | undefined {
  if (!code || code.length !== 2) return undefined
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

/** Turns a schema enum value like "backend-managed-profiles" or "CCS2_Combo2" into readable text. */
export function humanize(value: string): string {
  const spaced = value.replace(/[_-]/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Formats a single regional price, e.g. "€2,490 (DE)". */
export function formatRegionalPrice(p: RegionalPrice): string {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: p.currency,
    maximumFractionDigits: 0,
  }).format(p.value)
  return p.region ? `${amount} (${p.region})` : amount
}

/** Formats a manufacturer MSRP (pricing.schema.json) as one or more region-labeled amounts. */
export function formatPricing(pricing?: Pricing): string[] | undefined {
  if (!pricing) return undefined
  if (pricing.pricingModel === 'enquiry') return ['On request']
  return pricing.prices?.map(formatRegionalPrice)
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

  return comparisons.length > 0 ? comparisons : undefined
}

/** Formats a +/- percent change, e.g. "+8.0%". */
export function formatPercentDelta(percent: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(percent / 100)
}

/** Formats a +/- currency delta with an optional percent change, e.g. "+$200 (+8.0%)". */
export function formatPriceDelta({ delta, percent, currency }: PriceComparison): string {
  const amount = new Intl.NumberFormat('en-US', {
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
  const amount = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(delta)
  const amountLabel = unit ? `${amount} ${unit}` : amount
  if (percent == null || !Number.isFinite(percent)) return amountLabel
  return `${amountLabel} (${formatPercentDelta(percent)})`
}
