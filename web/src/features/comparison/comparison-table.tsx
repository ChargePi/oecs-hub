import { Banknote, Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ChargerVariant } from '@/lib/oecs/types'
import { cn } from '@/lib/utils'
import { useComparisonStore } from '@/stores/comparison-store'
import { ProductImage } from '@/features/product/product-image'
import { RatingsSummary } from '@/features/product/ratings-section'
import { FieldLabel } from '@/features/product/spec-section'
import { diffToneClasses, evaluateRow, rowDiffers } from './comparison-diff'
import type { ComparisonGroup } from './comparison-rows'
import { ComparisonValue, PricingValue, VariantActions } from './comparison-value'

const LABEL_CELL = 'sticky left-0 z-10 w-32 min-w-32 bg-card whitespace-normal md:w-56 md:min-w-56'

// Drawn as inset shadows: real borders collapse into the neighbouring cells and get
// painted over by the sticky label column.
const REFERENCE_OUTLINE = {
  top: 'shadow-[inset_1px_0_0_var(--color-primary),inset_-1px_0_0_var(--color-primary),inset_0_2px_0_var(--color-primary)]',
  middle: 'shadow-[inset_1px_0_0_var(--color-primary),inset_-1px_0_0_var(--color-primary)]',
  bottom:
    'shadow-[inset_1px_0_0_var(--color-primary),inset_-1px_0_0_var(--color-primary),inset_0_-2px_0_var(--color-primary)]',
}

function columnClass(isBaseline: boolean, edge: keyof typeof REFERENCE_OUTLINE = 'middle') {
  return cn(
    'min-w-48 align-top md:min-w-64',
    isBaseline && ['bg-primary/5', REFERENCE_OUTLINE[edge]],
  )
}

export function ComparisonTable({
  variants,
  baseline,
  groups,
}: {
  variants: ChargerVariant[]
  baseline: ChargerVariant
  groups: ComparisonGroup[]
}) {
  const remove = useComparisonStore((state) => state.remove)
  const setReference = useComparisonStore((state) => state.setReference)
  const highlight = useComparisonStore((state) => state.highlightDifferences)

  return (
    <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={LABEL_CELL} />
            {variants.map((variant) => {
              const isBaseline = highlight && variant.id === baseline.id
              return (
                <TableHead
                  key={variant.id}
                  className={cn(columnClass(isBaseline, 'top'), 'h-auto py-3 whitespace-normal')}
                >
                  <div className="flex items-start gap-3">
                    <ProductImage
                      src={variant.model.productImageUrl}
                      alt={variant.model.name}
                      className="size-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{variant.model.name}</p>
                      <p className="truncate text-xs font-normal text-muted-foreground">
                        {variant.manufacturer.name}
                      </p>
                    </div>
                    <VariantActions
                      variant={variant}
                      isBaseline={isBaseline}
                      onRemove={() => remove(variant.id)}
                      onSetReference={() => setReference(variant.id)}
                    />
                  </div>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="row" className={cn(LABEL_CELL, 'align-top')}>
              <span className="flex items-center gap-1.5 py-2">
                <Star className="size-4 text-primary" />
                Ratings
              </span>
            </TableHead>
            {variants.map((variant) => {
              const isBaseline = highlight && variant.id === baseline.id
              return (
                <TableCell key={variant.id} className={cn(columnClass(isBaseline), 'px-4')}>
                  <RatingsSummary ratings={variant.ratings} />
                </TableCell>
              )
            })}
          </TableRow>

          {groups.map((group) => {
            const differing = group.rows.filter((row) => rowDiffers(row, variants, baseline)).length
            return [
              <TableRow key={group.title} className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={variants.length + 1} className="py-2">
                  <span className="sticky left-3 inline-flex items-center gap-1.5 font-medium">
                    <group.icon className="size-4 text-primary" />
                    {group.title}
                    {highlight && differing > 0 && (
                      <Badge variant="outline" className="ml-1 font-normal text-muted-foreground">
                        {differing} {differing === 1 ? 'difference' : 'differences'}
                      </Badge>
                    )}
                  </span>
                </TableCell>
              </TableRow>,
              ...group.rows.map((row) => {
                const differs = rowDiffers(row, variants, baseline)
                return (
                  <TableRow key={`${group.title}-${row.label}`}>
                    <TableHead
                      scope="row"
                      className={cn(
                        LABEL_CELL,
                        'h-auto py-2 align-top font-normal whitespace-normal text-muted-foreground',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            highlight && differs ? 'bg-primary' : 'bg-transparent',
                          )}
                        />
                        <FieldLabel label={row.label} description={row.description} />
                      </span>
                    </TableHead>
                    {variants.map((variant) => {
                      const diff = evaluateRow(row, variant, baseline)
                      return (
                        <TableCell
                          key={variant.id}
                          className={cn(
                            columnClass(highlight && variant.id === baseline.id),
                            'px-2 py-1.5',
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-md px-2 py-1 font-medium break-words',
                              highlight && diffToneClasses[diff.tone],
                            )}
                          >
                            <ComparisonValue
                              row={row}
                              variant={variant}
                              baseline={baseline}
                              diff={diff}
                            />
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              }),
            ]
          })}

          <TableRow className="border-t-2 border-t-primary bg-primary/10 hover:bg-primary/10">
            <TableHead scope="row" className={cn(LABEL_CELL, 'align-top')}>
              <span className="flex items-center gap-1.5 py-2 text-primary">
                <Banknote className="size-4" />
                Pricing
              </span>
            </TableHead>
            {variants.map((variant) => {
              const isBaseline = highlight && variant.id === baseline.id
              return (
                <TableCell
                  key={variant.id}
                  className={cn(columnClass(isBaseline, 'bottom'), 'px-4')}
                >
                  <PricingValue variant={variant} baseline={baseline} />
                </TableCell>
              )
            })}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
