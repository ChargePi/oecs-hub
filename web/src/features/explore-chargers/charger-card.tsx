import type { DragEvent } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { humanize } from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/features/product/product-image'
import {
  MAX_COMPARISON_ITEMS,
  VARIANT_DRAG_MIME_TYPE,
  useComparisonStore,
} from '@/stores/comparison-store'

export function ChargerCard({
  variant,
  onClick,
}: {
  variant: ChargerVariant
  onClick: () => void
}) {
  const maxPowerKw = variant.hardware.electrical?.output?.maxPower?.value
  const connectorTypes = [...new Set(variant.hardware.connectors.map((c) => c.type))]

  const isSelected = useComparisonStore((state) => state.has(variant.id))
  const isFull = useComparisonStore((state) => state.variantIds.length >= MAX_COMPARISON_ITEMS)
  const toggleComparison = useComparisonStore((state) => state.toggle)

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(VARIANT_DRAG_MIME_TYPE, variant.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={cn(
        'cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:bg-muted/40',
        isSelected && 'ring-2 ring-primary',
      )}
    >
      <div className="relative">
        <ProductImage
          src={variant.model.productImageUrl}
          alt={variant.model.name}
          className="aspect-[5/6] w-full rounded-none border-0 border-b border-border"
        />
        <div
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            disabled={!isSelected && isFull}
            onCheckedChange={() => toggleComparison(variant.id)}
            aria-label={
              isSelected
                ? `Remove ${variant.model.name} from comparison`
                : `Add ${variant.model.name} to comparison`
            }
          />
        </div>
      </div>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="min-w-0">
          <CardTitle className="truncate text-lg">{variant.model.name}</CardTitle>
          <p className="truncate text-sm text-muted-foreground">{variant.manufacturer.name}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{humanize(variant.model.type)}</Badge>
          {maxPowerKw != null && <Badge variant="secondary">{maxPowerKw} kW</Badge>}
          {connectorTypes.slice(0, 3).map((type) => (
            <Badge key={type} variant="outline">
              {humanize(type)}
            </Badge>
          ))}
          {connectorTypes.length > 3 && (
            <Badge variant="outline">+{connectorTypes.length - 3} more</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
