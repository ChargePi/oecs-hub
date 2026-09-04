import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ManufacturerCard } from '@/features/explorer/manufacturer-card'
import { useManufacturerSearch } from './use-manufacturer-search'

export function ManufacturersPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useManufacturerSearch(debouncedQuery)
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
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <h1 className="text-lg font-semibold">Manufacturers</h1>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search manufacturers…"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ManufacturerCardSkeleton key={i} />
          ))}
        </div>
      ) : manufacturers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          {debouncedQuery ? `No manufacturers match "${debouncedQuery}".` : 'No manufacturers yet.'}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <p className="text-xs text-muted-foreground">
            {totalSize} manufacturer{totalSize === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {manufacturers.map((manufacturer) => (
              <ManufacturerCard key={manufacturer.id} manufacturer={manufacturer} />
            ))}
          </div>
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <ManufacturerCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Mirrors ManufacturerCard's shape (icon block + title/subtitle, no image) so the
 *  loading state doesn't jump/resize once real cards arrive. */
function ManufacturerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}
