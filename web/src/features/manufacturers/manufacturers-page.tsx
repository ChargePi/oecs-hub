import { useEffect, useRef } from 'react'

import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ManufacturerCard } from '@/features/explorer/manufacturer-card'
import { useManufacturerSearch } from './use-manufacturer-search'

// Fixed-width cards in a centered flex-wrap, so a partial last row stays centered too.
const GRID = 'flex flex-wrap justify-center gap-4 *:w-full sm:*:w-80'

export function ManufacturersPage() {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useManufacturerSearch('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const manufacturers = data?.pages.flatMap((page) => page.items) ?? []
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-baseline justify-center gap-3">
          <h1 className="text-2xl font-semibold">Manufacturers</h1>
          {!isLoading && totalSize > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">{totalSize}</span>
          )}
        </div>

        {isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <ManufacturerCardSkeleton key={i} />
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            No manufacturers yet.
          </div>
        ) : (
          <>
            <div className={GRID}>
              {manufacturers.map((manufacturer) => (
                <ManufacturerCard key={manufacturer.id} manufacturer={manufacturer} />
              ))}
            </div>
            <div ref={sentinelRef} />
            {isFetchingNextPage && (
              <div className={GRID}>
                {Array.from({ length: 3 }, (_, i) => (
                  <ManufacturerCardSkeleton key={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Mirrors ManufacturerCard's shape (logo block + name/country/stats lines) so the
 *  loading state doesn't jump/resize once real cards arrive. */
function ManufacturerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Skeleton className="size-12 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardHeader>
    </Card>
  )
}
