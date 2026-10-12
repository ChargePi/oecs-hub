import { Square, SquareCheckBig, Trash2, TrendingDown, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  comparePricing,
  formatNumericDelta,
  formatPercentDelta,
  formatPriceDelta,
  formatRegionalPrice,
} from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { cn } from '@/lib/utils'
import { useComparisonStore } from '@/stores/comparison-store'
import { boolBadge, diffBadgeGroup } from '@/features/product/spec-badges'
import {
  diffToneClasses,
  diffToneTextClasses,
  type DiffTone,
  type RowDiff,
} from './comparison-diff'
import type { ComparisonRow } from './comparison-rows'

function formatDelta(row: ComparisonRow, delta: number, percent?: number): string {
  if (row.unit) return formatNumericDelta(delta, row.unit, percent)
  if (percent != null) return formatPercentDelta(percent)
  return formatNumericDelta(delta)
}

function DeltaChip({ tone, children }: { tone: DiffTone; children: string }) {
  const Icon = tone === 'better' ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        diffToneTextClasses[tone],
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  )
}

/** One row's value for one variant, shared by the card and table layouts. */
export function ComparisonValue({
  row,
  variant,
  baseline,
  diff,
}: {
  row: ComparisonRow
  variant: ChargerVariant
  baseline: ChargerVariant
  diff: RowDiff
}) {
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const showDelta = highlight && diff.delta != null

  if (row.items) {
    const items = row.items(variant) ?? []
    if (items.length === 0) return <>—</>
    const referenceTexts = new Set((row.items(baseline) ?? []).map((item) => item.text))
    const commonTexts = new Set(
      items.filter((item) => !highlight || referenceTexts.has(item.text)).map((item) => item.text),
    )
    return <>{diffBadgeGroup(items, commonTexts)}</>
  }

  if (row.boolValue) return <>{boolBadge(row.boolValue(variant) ?? false)}</>

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn(showDelta && 'min-w-16')}>{row.render?.(variant)}</span>
      {showDelta && diff.delta != null && (
        <DeltaChip tone={diff.tone}>{formatDelta(row, diff.delta, diff.percent)}</DeltaChip>
      )}
    </span>
  )
}

export function PricingValue({
  variant,
  baseline,
}: {
  variant: ChargerVariant
  baseline: ChargerVariant
}) {
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const isBaseline = variant.id === baseline.id
  const isFixed = variant.pricing?.pricingModel === 'fixed'
  const comparisons = !isBaseline ? comparePricing(variant.pricing, baseline.pricing) : undefined

  return (
    <div className="flex flex-col gap-2">
      {isFixed && variant.pricing?.prices?.length ? (
        <div className="flex flex-col gap-1.5">
          {variant.pricing.prices.map((price, i) => {
            const comparison = comparisons?.find(
              (c) => c.currency === price.currency && c.region === price.region,
            )
            const delta = comparison?.delta ?? 0
            const tone: DiffTone = delta === 0 ? 'same' : delta < 0 ? 'better' : 'worse'
            return (
              <div
                key={i}
                className={cn(
                  'flex w-fit flex-wrap items-center gap-1.5',
                  highlight && tone !== 'same' && '-mx-2 rounded-md px-2 py-1',
                  highlight && diffToneClasses[tone],
                )}
              >
                <Badge variant="secondary" className="text-sm">
                  {formatRegionalPrice(price)}
                </Badge>
                {highlight && comparison && tone !== 'same' && (
                  <DeltaChip tone={tone}>{formatPriceDelta(comparison)}</DeltaChip>
                )}
              </div>
            )
          })}
        </div>
      ) : variant.pricing?.pricingModel === 'enquiry' ? (
        <Badge variant="secondary" className="w-fit text-sm">
          On request
        </Badge>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
      {highlight && !isBaseline && comparisons && (
        <p className="text-xs text-muted-foreground">vs {baseline.model.name}</p>
      )}
      {variant.pricing?.notes && (
        <p className="text-xs text-muted-foreground">{variant.pricing.notes}</p>
      )}
    </div>
  )
}

export function VariantActions({
  variant,
  isBaseline,
  onRemove,
  onSetReference,
}: {
  variant: ChargerVariant
  isBaseline: boolean
  onRemove: () => void
  onSetReference: () => void
}) {
  const highlight = useComparisonStore((state) => state.highlightDifferences)

  return (
    <div className="flex shrink-0 items-center gap-1">
      {highlight && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSetReference}
              disabled={isBaseline}
              aria-pressed={isBaseline}
              aria-label={
                isBaseline
                  ? `${variant.model.name} is the reference`
                  : `Set ${variant.model.name} as reference`
              }
              className={cn(
                'flex size-8 items-center justify-center rounded-md transition-colors',
                isBaseline
                  ? 'cursor-default text-primary'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
              )}
            >
              {isBaseline ? <SquareCheckBig className="size-4" /> : <Square className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{isBaseline ? 'Reference variant' : 'Set as reference'}</TooltipContent>
        </Tooltip>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${variant.model.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
