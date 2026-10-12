import type { ChargerVariant } from '@/lib/oecs/types'
import type { ComparisonRow } from './comparison-rows'

export type DiffTone = 'same' | 'better' | 'worse' | 'differs'

export interface RowDiff {
  tone: DiffTone
  delta?: number
  percent?: number
}

export const diffToneClasses: Record<DiffTone, string> = {
  same: '',
  better: 'ring-1 ring-inset ring-success/70 bg-success/5',
  worse: 'ring-1 ring-inset ring-destructive/70 bg-destructive/5',
  differs: 'ring-1 ring-inset ring-muted-foreground/50 bg-muted/40',
}

export const diffToneTextClasses: Record<DiffTone, string> = {
  same: '',
  better: 'text-success',
  worse: 'text-destructive',
  differs: 'text-muted-foreground',
}

const SAME: RowDiff = { tone: 'same' }

/** A strict superset of the reference's items is better, a strict subset worse. */
function itemsTone(texts: Set<string>, referenceTexts: Set<string>): DiffTone {
  const missing = [...referenceTexts].some((text) => !texts.has(text))
  const extra = [...texts].some((text) => !referenceTexts.has(text))
  if (!missing && !extra) return 'same'
  if (extra && !missing) return 'better'
  if (missing && !extra) return 'worse'
  return 'differs'
}

/** Judges `variant`'s value for `row` against the reference; the reference itself is `same`. */
export function evaluateRow(
  row: ComparisonRow,
  variant: ChargerVariant,
  baseline: ChargerVariant,
): RowDiff {
  if (variant.id === baseline.id) return SAME

  if (row.items) {
    const texts = new Set((row.items(variant) ?? []).map((item) => item.text))
    const referenceTexts = new Set((row.items(baseline) ?? []).map((item) => item.text))
    return { tone: itemsTone(texts, referenceTexts) }
  }

  if (row.numericValue) {
    const value = row.numericValue(variant)
    const baseValue = row.numericValue(baseline)
    if (value == null || baseValue == null) {
      return value == null && baseValue == null ? SAME : { tone: 'differs' }
    }
    const delta = value - baseValue
    if (delta === 0 || Number.isNaN(delta)) return SAME
    const percent = baseValue ? (delta / baseValue) * 100 : undefined
    const favorable = (row.betterDirection ?? 'higher') === 'higher' ? delta > 0 : delta < 0
    return { tone: favorable ? 'better' : 'worse', delta, percent }
  }

  if (row.boolValue) {
    const value = row.boolValue(variant) ?? false
    const baseValue = row.boolValue(baseline) ?? false
    if (value === baseValue) return SAME
    return { tone: value ? 'better' : 'worse' }
  }

  if (row.diffKey && row.diffKey(variant) !== row.diffKey(baseline)) return { tone: 'differs' }

  return SAME
}

export function rowDiffers(
  row: ComparisonRow,
  variants: ChargerVariant[],
  baseline: ChargerVariant,
): boolean {
  return variants.some((variant) => evaluateRow(row, variant, baseline).tone !== 'same')
}
