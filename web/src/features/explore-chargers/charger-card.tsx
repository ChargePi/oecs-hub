import type { ComponentType, DragEvent, ReactNode } from 'react'

import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { humanize } from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/features/product/product-image'
import { SPEC_ICONS } from '@/features/product/spec-icons'
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
        <div className="min-w-0 text-center">
          <CardTitle className="truncate text-lg">{variant.model.name}</CardTitle>
          <p className="truncate text-sm text-muted-foreground">{variant.manufacturer.name}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border pt-3 text-sm">
          <Spec icon={SPEC_ICONS.chargerType} label="Type">{humanize(variant.model.type)}</Spec>
          <Spec icon={SPEC_ICONS.power} label="Max power">{maxPowerKw != null ? `${maxPowerKw} kW` : '—'}</Spec>
          <Spec icon={SPEC_ICONS.connectors} label="Connectors">
            {connectorTypes.length > 0 ? connectorTypes.map(humanize).join(', ') : '—'}
          </Spec>
        </dl>
      </CardContent>
    </Card>
  )
}

function Spec({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
}) {
  return (
    <>
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 shrink-0 text-primary" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </>
  )
}
