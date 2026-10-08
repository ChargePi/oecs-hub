import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useResizableWidth } from '@/hooks/use-resizable-width'
import type { ChargerVariant, Manufacturer, Product } from '@/lib/oecs/types'
import { registryClient } from '@/lib/registry/client'
import { cn } from '@/lib/utils'
import { AddToComparisonButton } from '@/features/product/add-to-comparison-button'
import { FavoriteButton } from '@/features/product/favorite-button'
import { ManufacturerCard } from '@/features/product/manufacturer-card'
import { ManufacturerLogo } from '@/features/product/manufacturer-logo'
import { ProductDetail } from '@/features/product/product-detail'

export type GraphSelection =
  | { kind: 'manufacturer'; manufacturer: Manufacturer; products: Product[] }
  | { kind: 'product'; product: Product }
  | { kind: 'variant'; variant: Product['variants'][number] }
  | null

/** Below this the panel can't dock beside the graph/grid and the chat, so it becomes a sheet. */
const DOCKED_QUERY = '(min-width: 1024px)'
const DEFAULT_WIDTH = 384
/** Room left beside the panel for the graph/grid plus a docked assistant. */
const MIN_PAGE_WIDTH = 800

/**
 * Product/variant graph nodes only carry the lightweight summary fetched for the graph
 * (empty hardware/software) — fetch the full spec once a node is actually opened.
 */
function useFullVariant(stub: ChargerVariant | undefined) {
  return useQuery({
    queryKey: ['variant', stub?.id],
    queryFn: () => registryClient.getVariant(stub!.id),
    enabled: stub != null,
  })
}

function selectionTitle(selection: NonNullable<GraphSelection>) {
  switch (selection.kind) {
    case 'manufacturer':
      return selection.manufacturer.name
    case 'product':
      return selection.product.series
    case 'variant':
      return selection.variant.model.name
  }
}

/**
 * Details for the selected graph node / grid card. Docked as a non-modal column on the left
 * on wide screens, so the graph/grid and the assistant stay usable beside it; a sheet otherwise.
 */
export function NodeDetailPanel({
  selection,
  onSelectionChange,
}: {
  selection: GraphSelection
  onSelectionChange: (selection: GraphSelection) => void
}) {
  const docked = useMediaQuery(DOCKED_QUERY)
  const stub =
    selection?.kind === 'product'
      ? selection.product.variants[0]
      : selection?.kind === 'variant'
        ? selection.variant
        : undefined
  const { data: fullVariant, isLoading } = useFullVariant(stub)

  if (selection == null) return null

  const close = () => onSelectionChange(null)
  const actions =
    (selection.kind === 'product' || selection.kind === 'variant') && fullVariant ? (
      <>
        <FavoriteButton variant={fullVariant} />
        <AddToComparisonButton variant={fullVariant} />
      </>
    ) : undefined
  const body = (
    <NodeDetailBody selection={selection} fullVariant={fullVariant} isLoading={isLoading} />
  )

  if (!docked) {
    return (
      <Sheet open onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" headerActions={actions} aria-describedby={undefined}>
          <SheetTitle className="sr-only">{selectionTitle(selection)}</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DockedPanel title={selectionTitle(selection)} actions={actions} onClose={close}>
      {body}
    </DockedPanel>
  )
}

function DockedPanel({
  title,
  actions,
  onClose,
  children,
}: {
  title: string
  actions: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const { width, dragging, handle } = useResizableWidth({
    storageKey: 'oecs.detail-panel.width',
    defaultWidth: DEFAULT_WIDTH,
    minWidth: 320,
    maxWidth: 720,
    minPageWidth: MIN_PAGE_WIDTH,
    edge: 'right',
  })

  return (
    <aside
      aria-label="Charger details"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-background"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize details"
        aria-valuenow={width}
        tabIndex={0}
        title="Drag to resize, double-click to reset"
        className={cn(
          'absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none hover:bg-primary/30 focus-visible:bg-primary/40',
          dragging && 'bg-primary/40',
        )}
        {...handle}
      />
      <div className="flex items-center justify-end gap-1 border-b border-border px-3 py-1.5">
        <h2 className="sr-only">{title}</h2>
        {actions}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close details"
          className="hover:bg-primary/10 hover:text-primary"
        >
          <XIcon />
        </Button>
      </div>
      {children}
    </aside>
  )
}

function NodeDetailBody({
  selection,
  fullVariant,
  isLoading,
}: {
  selection: NonNullable<GraphSelection>
  fullVariant: ChargerVariant | null | undefined
  isLoading: boolean
}) {
  if (selection.kind === 'manufacturer') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <ManufacturerLogo
            logoUrl={selection.manufacturer.logoUrl}
            className="size-10"
            iconClassName="size-5"
          />
          <p className="font-heading text-base font-medium text-foreground">
            {selection.manufacturer.name}
          </p>
        </div>
        <div className="overflow-y-auto p-4">
          <ManufacturerCard manufacturer={selection.manufacturer} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {selection.kind === 'product' && (
        <p className="mb-4 text-xs text-muted-foreground">
          Base model of the {selection.product.series} line · {selection.product.variants.length}{' '}
          variant
          {selection.product.variants.length === 1 ? '' : 's'} total
        </p>
      )}
      {isLoading || !fullVariant ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ProductDetail variant={fullVariant} />
      )}
    </div>
  )
}
