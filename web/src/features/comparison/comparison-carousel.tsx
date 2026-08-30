import { Link } from 'react-router'
import { GitCompare, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ChargerVariant } from '@/lib/oecs/types'
import { MAX_COMPARISON_ITEMS, useComparisonStore } from '@/stores/comparison-store'
import { AddChargerControl } from './add-charger-control'
import {
  ComparisonGroupCell,
  ComparisonHeaderCell,
  ComparisonPricingCell,
  ComparisonRatingsCell,
} from './comparison-card'
import { comparisonGroups } from './comparison-rows'

function ComparisonLegend() {
  return (
    <div className="mx-auto mb-4 flex w-fit max-w-[50rem] items-start gap-3.5 rounded-lg border border-border bg-card/50 px-5 py-3.5 text-base text-muted-foreground">
      <Info className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="flex flex-col gap-1.5">
        <p>
          <span className="font-medium text-primary">Outlined</span> card is the reference; click{' '}
          <span className="font-medium text-foreground">Set as reference</span> to change it.
        </p>
        <p>
          <span className="font-medium text-success">Green</span>/
          <span className="font-medium text-destructive">red</span> means better/worse than the
          reference;{' '}
          <span className="font-semibold underline decoration-dotted underline-offset-4">
            underlined
          </span>{' '}
          just differs. Solid pills are unique to one charger.
        </p>
      </div>
    </div>
  )
}

export function ComparisonCarousel({ variants }: { variants: ChargerVariant[] }) {
  const remove = useComparisonStore((state) => state.remove)
  const referenceId = useComparisonStore((state) => state.referenceId)
  const setReference = useComparisonStore((state) => state.setReference)
  const canAddMore = variants.length < MAX_COMPARISON_ITEMS
  const baseline = variants.find((v) => v.id === referenceId) ?? variants[0]

  return (
    <div className="flex flex-col">
      <ComparisonLegend />
      <div className="overflow-x-auto pb-4">
        <div className="mx-auto flex w-fit items-stretch gap-4">
          <div
            className="grid gap-x-4"
            style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(560px, 640px))` }}
          >
            {variants.map((variant) => (
              <ComparisonHeaderCell
                key={variant.id}
                variant={variant}
                isBaseline={variant.id === baseline.id}
                onRemove={() => remove(variant.id)}
                onSetReference={() => setReference(variant.id)}
              />
            ))}

            {comparisonGroups.map((group) =>
              variants.map((variant) => (
                <ComparisonGroupCell
                  key={`${group.title}-${variant.id}`}
                  group={group}
                  variant={variant}
                  baseline={baseline}
                />
              )),
            )}

            {variants.map((variant) => (
              <ComparisonPricingCell key={variant.id} variant={variant} baseline={baseline} />
            ))}

            {variants.map((variant) => (
              <ComparisonRatingsCell key={variant.id} variant={variant} baseline={baseline} />
            ))}
          </div>

          {canAddMore && <AddChargerControl />}
        </div>
      </div>
    </div>
  )
}

export function EmptyComparisonState() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border px-10 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GitCompare className="size-6" />
        </div>
        <p className="text-muted-foreground">Add a variant to start comparing.</p>
        <Button asChild>
          <Link to="/">Go to explorer</Link>
        </Button>
      </div>
    </div>
  )
}
