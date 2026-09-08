import { useQuery } from '@tanstack/react-query'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChargePointCandidate } from '@/lib/chat/types'
import { registryClient } from '@/lib/registry/client'
import { ProductDetail } from '@/features/product/product-detail'

/** A chat ChargePointCandidate.id is the same ID space as a registry ChargerVariant.id
 *  (mirrored 1:1 from the registry on the backend, and already relied on by
 *  compose_answer.go's markdown deep links and graph-page.tsx's `?variant=` handling) -
 *  safe to fetch the full spec directly. */
function useCandidateVariant(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['variant', candidateId],
    queryFn: () => registryClient.getVariant(candidateId!),
    enabled: candidateId != null,
  })
}

export function ItemDetailSheet({
  candidate,
  onClose,
}: {
  candidate: ChargePointCandidate | null
  onClose: () => void
}) {
  const { data: variant, isLoading } = useCandidateVariant(candidate?.id)

  return (
    <Sheet open={candidate != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {candidate && (
          <>
            <SheetHeader>
              <SheetTitle>
                {candidate.manufacturerName} {candidate.modelName}
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : variant ? (
                <ProductDetail variant={variant} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Full spec unavailable for this charger — it may have been removed from
                  the registry.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
