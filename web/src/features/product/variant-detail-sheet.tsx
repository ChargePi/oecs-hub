import { useQuery } from '@tanstack/react-query'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { registryClient } from '@/lib/registry/client'
import { FavoriteButton } from './favorite-button'
import { ProductDetail } from './product-detail'

/**
 * A self-contained variant detail drawer, opened by variantId rather than a full
 * ChargerVariant - for list-style views (favorites, project members, rated chargers) that
 * only carry the search-summary shape and fetch the full spec on demand, same pattern as
 * chat's item-detail-sheet.tsx and the graph's node-detail-sheet.tsx.
 */
export function VariantDetailSheet({
  variantId,
  title,
  onClose,
}: {
  variantId: string | null
  title?: string
  onClose: () => void
}) {
  const { data: variant, isLoading } = useQuery({
    queryKey: ['variant', variantId],
    queryFn: () => registryClient.getVariant(variantId!),
    enabled: variantId != null,
  })

  return (
    <Sheet open={variantId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent headerActions={variant ? <FavoriteButton variant={variant} /> : undefined}>
        {variantId != null && (
          <>
            <SheetHeader>
              <SheetTitle>{title ?? 'Charger details'}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : variant ? (
                <ProductDetail variant={variant} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Full spec unavailable for this charger — it may have been removed from the
                  registry.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
