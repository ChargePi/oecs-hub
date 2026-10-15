import { Banknote } from 'lucide-react'

import type { ChargerVariant } from '@/lib/oecs/types'
import { cn } from '@/lib/utils'
import { useComparisonStore } from '@/stores/comparison-store'
import { SpecRow, SpecSection } from '@/features/product/spec-section'
import { RatingsSection } from '@/features/product/ratings-section'
import { ProductImage } from '@/features/product/product-image'
import { diffToneClasses, evaluateRow } from './comparison-diff'
import type { ComparisonGroup, ComparisonRow } from './comparison-rows'
import { ComparisonValue, PricingValue, VariantActions } from './comparison-value'

/**
 * Comparison cards are laid out as a CSS grid (one column per variant, auto row-flow) rather
 * than stacked flex columns — that's what keeps the same spec aligned at the same height across
 * every variant, since each of these cells is its own grid row-item rather than free-flowing
 * content inside an independent container.
 */

/** Renders one `ComparisonRow` against `baseline`, ringed when it differs — shared by the body
 *  group cells and the header's embedded charger-type rows. */
function ComparisonSpecRow({
  row,
  variant,
  baseline,
}: {
  row: ComparisonRow
  variant: ChargerVariant
  baseline: ChargerVariant
}) {
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const diff = evaluateRow(row, variant, baseline)
  const ringed = highlight && diff.tone !== 'same'

  return (
    <SpecRow
      label={row.label}
      value={<ComparisonValue row={row} variant={variant} baseline={baseline} diff={diff} />}
      description={row.description}
      inline={row.inline}
      wide={!!row.items}
      className={cn(
        ringed && '-mx-2 rounded-md border-b-transparent px-2',
        ringed && diffToneClasses[diff.tone],
      )}
    />
  )
}

export function ComparisonHeaderCell({
  rows,
  variant,
  baseline,
  onRemove,
  onSetReference,
}: {
  rows: ComparisonRow[]
  variant: ChargerVariant
  baseline: ChargerVariant
  onRemove: () => void
  onSetReference: () => void
}) {
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const isBaseline = highlight && variant.id === baseline.id

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-t-xl border border-b-0 bg-card px-4 pt-3 pb-4',
        isBaseline ? 'border-2 border-b-0 border-primary' : 'border-border',
      )}
    >
      <div className="flex justify-end">
        <VariantActions
          variant={variant}
          isBaseline={isBaseline}
          onRemove={onRemove}
          onSetReference={onSetReference}
        />
      </div>

      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <ProductImage
          src={variant.model.productImageUrl}
          alt={variant.model.name}
          className="aspect-square w-full self-start"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{variant.model.name}</p>
          <div className="mt-1 flex flex-col gap-1">
            {rows.map((row) => (
              <ComparisonSpecRow key={row.label} row={row} variant={variant} baseline={baseline} />
            ))}
          </div>
        </div>
      </div>
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
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const isBaseline = highlight && variant.id === baseline.id

  return (
    <div
      className={cn('border-x bg-card px-4 py-3', isBaseline ? 'border-primary' : 'border-border')}
    >
      <SpecSection title={group.title} icon={group.icon} columns={3}>
        {group.rows.map((row) => (
          <ComparisonSpecRow key={row.label} row={row} variant={variant} baseline={baseline} />
        ))}
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
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const isBaseline = highlight && variant.id === baseline.id

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-b-xl border-x border-t-2 border-b bg-primary/10 px-4 py-4',
        isBaseline ? 'border-2 border-primary' : 'border-border border-t-primary',
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
        <Banknote className="size-4" />
        Pricing
      </div>
      <PricingValue variant={variant} baseline={baseline} />
    </div>
  )
}

/** Individual-submitted ratings, rendered right under the header, ahead of the spec groups.
 *  See RatingsSection for the shared display logic with ProductDetail. */
export function ComparisonRatingsCell({
  variant,
  baseline,
}: {
  variant: ChargerVariant
  baseline: ChargerVariant
}) {
  const highlight = useComparisonStore((state) => state.highlightDifferences)
  const isBaseline = highlight && variant.id === baseline.id

  return (
    <div
      className={cn('border-x bg-card px-4 py-3', isBaseline ? 'border-primary' : 'border-border')}
    >
      <RatingsSection ratings={variant.ratings} />
    </div>
  )
}
