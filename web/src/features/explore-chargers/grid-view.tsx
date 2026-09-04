import { useEffect, useRef } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import type { ChargerVariant } from '@/lib/oecs/types'
import type { ChargerFilters } from '@/lib/registry/types'
import { ChargerCard } from './charger-card'
import { useChargerSearch } from './use-charger-search'

export function GridView({
  filters,
  onSelectVariant,
}: {
  filters: ChargerFilters
  onSelectVariant: (variant: ChargerVariant) => void
}) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useChargerSearch(filters)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const variants = data?.pages.flatMap((page) => page.items) ?? []
  const totalSize = data?.pages[0]?.totalSize ?? 0

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No chargers match these filters.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <p className="text-xs text-muted-foreground">
        {totalSize} charger{totalSize === 1 ? '' : 's'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {variants.map((variant) => (
          <ChargerCard
            key={variant.id}
            variant={variant}
            onClick={() => onSelectVariant(variant)}
          />
        ))}
      </div>
      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Mirrors ChargerCard's shape (image top ~half, title/subtitle/badges below) so the
 *  loading state doesn't jump/resize once real cards arrive. */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Skeleton className="aspect-[5/6] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}
