import { Banknote, Check, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  comparePricing,
  formatNumericDelta,
  formatPercentDelta,
  formatPriceDelta,
  formatRegionalPrice,
} from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { cn } from '@/lib/utils'
import { diffBadgeGroup } from '@/features/product/spec-badges'
import { SpecRow, SpecSection } from '@/features/product/spec-section'
import type { ComparisonGroup } from './comparison-rows'

/**
 * Comparison cards are laid out as a CSS grid (one column per variant, auto row-flow) rather
 * than stacked flex columns — that's what keeps the same spec aligned at the same height across
 * every variant, since each of these cells is its own grid row-item rather than free-flowing
 * content inside an independent container.
 */

export function ComparisonHeaderCell({
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
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-t-xl border border-b-0 bg-card px-4 pt-4 pb-3',
        isBaseline ? 'border-2 border-b-0 border-primary' : 'border-border',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{variant.model.name}</p>
        <p className="truncate text-xs text-muted-foreground">{variant.manufacturer.name}</p>
        <button
          type="button"
          onClick={onSetReference}
          disabled={isBaseline}
          className={cn(
            'mt-1.5 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
            isBaseline
              ? 'cursor-default border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
          )}
        >
          {isBaseline && <Check className="size-3" />}
          {isBaseline ? 'Reference' : 'Set as reference'}
        </button>
      </div>
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

export function ComparisonGroupCell({
  group,
  variant,
  baseline,
}: {
  group: ComparisonGroup
  variant: ChargerVariant
  baseline: ChargerVariant
}) {
  const isBaseline = variant.id === baseline.id

  return (
    <div
      className={cn('border-x bg-card px-4 py-3', isBaseline ? 'border-primary' : 'border-border')}
    >
      <SpecSection title={group.title} icon={group.icon} columns={3}>
        {group.rows.map((row) => {
          if (row.items) {
            const items = row.items(variant) ?? []
            const referenceTexts = new Set((row.items(baseline) ?? []).map((item) => item.text))
            const commonTexts = new Set(
              items.filter((item) => referenceTexts.has(item.text)).map((item) => item.text),
            )
            return (
              <SpecRow
                key={row.label}
                label={row.label}
                value={diffBadgeGroup(items, commonTexts)}
                description={row.description}
                wide
              />
            )
          }

          if (row.numericValue) {
            const value = row.numericValue(variant)
            const baseValue = row.numericValue(baseline)
            const isBaseline = variant.id === baseline.id
            const delta = value != null && baseValue != null ? value - baseValue : undefined
            const percent = delta && baseValue ? (delta / baseValue) * 100 : undefined
            const direction = row.betterDirection ?? 'higher'
            const isBetter = !!delta && (direction === 'higher' ? delta > 0 : delta < 0)
            const isWorse = !!delta && (direction === 'higher' ? delta < 0 : delta > 0)

            return (
              <SpecRow
                key={row.label}
                label={row.label}
                value={
                  <span className="inline-flex flex-wrap items-baseline gap-1.5">
                    <span className={cn(isBetter && 'text-success', isWorse && 'text-destructive')}>
                      {row.render?.(variant)}
                    </span>
                    {!isBaseline && delta != null && delta !== 0 && (
                      <span
                        className={cn(
                          'text-xs',
                          isBetter && 'text-success',
                          isWorse && 'text-destructive',
                        )}
                      >
                        {row.unit
                          ? formatNumericDelta(delta, row.unit, percent)
                          : percent != null
                            ? formatPercentDelta(percent)
                            : formatNumericDelta(delta)}
                      </span>
                    )}
                  </span>
                }
                description={row.description}
                inline={row.inline}
              />
            )
          }

          const hasDiff = row.diffKey ? row.diffKey(variant) !== row.diffKey(baseline) : false

          return (
            <SpecRow
              key={row.label}
              label={row.label}
              value={
                <span
                  className={cn(
                    hasDiff && 'font-semibold underline decoration-dotted underline-offset-4',
                  )}
                >
                  {row.render?.(variant)}
                </span>
              }
              description={row.description}
              inline={row.inline}
            />
          )
        })}
      </SpecSection>
    </div>
  )
}

export function ComparisonPricingCell({
  variant,
  baseline,
}: {
  variant: ChargerVariant
  baseline: ChargerVariant
}) {
  const isBaseline = variant.id === baseline.id
  const isFixed = variant.pricing?.pricingModel === 'fixed'
  const comparisons = !isBaseline ? comparePricing(variant.pricing, baseline.pricing) : undefined

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-b-xl border border-t-2 bg-primary/10 px-4 py-4',
        isBaseline ? 'border-2 border-t-2 border-primary' : 'border-border border-t-primary',
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
        <Banknote className="size-4" />
        Pricing
      </div>
      {isFixed && variant.pricing?.prices?.length ? (
        <div className="flex flex-col gap-1.5">
          {variant.pricing.prices.map((price, i) => {
            const comparison = comparisons?.find(
              (c) => c.currency === price.currency && c.region === price.region,
            )
            return (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-sm">
                  {formatRegionalPrice(price)}
                </Badge>
                {comparison && comparison.delta !== 0 && (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      comparison.delta < 0 && 'text-success',
                      comparison.delta > 0 && 'text-destructive',
                    )}
                  >
                    {formatPriceDelta(comparison)}
                  </span>
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
      {!isBaseline && comparisons && (
        <p className="text-xs text-muted-foreground">vs {baseline.model.name}</p>
      )}
      {variant.pricing?.notes && (
        <p className="text-xs text-muted-foreground">{variant.pricing.notes}</p>
      )}
    </div>
  )
}
