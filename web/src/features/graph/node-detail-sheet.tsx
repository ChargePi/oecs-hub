import { useQuery } from '@tanstack/react-query'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChargerVariant, Manufacturer, Product } from '@/lib/oecs/types'
import { registryClient } from '@/lib/registry/client'
import { ManufacturerCard } from '@/features/product/manufacturer-card'
import { ManufacturerLogo } from '@/features/product/manufacturer-logo'
import { ProductDetail } from '@/features/product/product-detail'

export type GraphSelection =
  | { kind: 'manufacturer'; manufacturer: Manufacturer; products: Product[] }
  | { kind: 'product'; product: Product }
  | { kind: 'variant'; variant: Product['variants'][number] }
  | null

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

export function NodeDetailSheet({
  selection,
  onSelectionChange,
}: {
  selection: GraphSelection
  onSelectionChange: (selection: GraphSelection) => void
}) {
  const stub =
    selection?.kind === 'product'
      ? selection.product.variants[0]
      : selection?.kind === 'variant'
        ? selection.variant
        : undefined
  const { data: fullVariant, isLoading } = useFullVariant(stub)

  return (
    <Sheet open={selection != null} onOpenChange={(open) => !open && onSelectionChange(null)}>
      <SheetContent>
        {selection?.kind === 'manufacturer' && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <ManufacturerLogo
                  logoUrl={selection.manufacturer.logoUrl}
                  className="size-10"
                  iconClassName="size-5"
                />
                <SheetTitle>{selection.manufacturer.name}</SheetTitle>
              </div>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              <ManufacturerCard manufacturer={selection.manufacturer} />
            </div>
          </>
        )}

        {selection?.kind === 'product' && (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">{selection.product.series}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              <p className="mb-4 text-xs text-muted-foreground">
                Base model of the {selection.product.series} line ·{' '}
                {selection.product.variants.length} variant
                {selection.product.variants.length === 1 ? '' : 's'} total
              </p>
              {isLoading || !fullVariant ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ProductDetail variant={fullVariant} />
              )}
            </div>
          </>
        )}

        {selection?.kind === 'variant' && (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">{selection.variant.model.name}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              {isLoading || !fullVariant ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ProductDetail variant={fullVariant} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
