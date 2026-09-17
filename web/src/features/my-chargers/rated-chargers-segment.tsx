import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { AuthRequiredError } from '@/lib/errors'
import { RATING_CATEGORIES } from '@/lib/oecs/rating-categories'
import type { MyRating } from '@/lib/user-chargers/types'
import { listMyRatings } from '@/lib/user-chargers/client'
import { VariantDetailSheet } from '@/features/product/variant-detail-sheet'

const PAGE_SIZE = 20

function categoryLabel(name: string): string {
  return RATING_CATEGORIES.find((c) => c.name === name)?.label ?? name
}

function overallAverage(entry: MyRating): number | null {
  if (entry.aggregate.length === 0) return null
  const sum = entry.aggregate.reduce((total, r) => total + r.average, 0)
  return sum / entry.aggregate.length
}

export function RatedChargersSegment() {
  const [openVariantId, setOpenVariantId] = useState<string | null>(null)

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['user-chargers', 'my-ratings'],
      queryFn: ({ pageParam }) => listMyRatings({ pageSize: PAGE_SIZE, pageToken: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    })

  useEffect(() => {
    if (error instanceof AuthRequiredError) redirectToLogin()
  }, [error])

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const ratings = data?.pages.flatMap((page) => page.ratings) ?? []

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Charger</TableHead>
            <TableHead>Your scores</TableHead>
            <TableHead>Overall average</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isError || ratings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                {isError ? (
                  "Ratings aren't available right now."
                ) : (
                  <span className="flex flex-col items-center gap-2">
                    <Star className="size-6" aria-hidden="true" />
                    You haven't rated any chargers yet.
                  </span>
                )}
              </TableCell>
            </TableRow>
          ) : (
            ratings.map((entry) => {
              const average = overallAverage(entry)

              return (
                <TableRow key={entry.charger.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => setOpenVariantId(entry.charger.id)}
                    >
                      {entry.charger.model.name}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {entry.charger.manufacturer.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.myScores.map((score) => (
                        <Badge key={score.categoryName} variant="outline">
                          {categoryLabel(score.categoryName)}: {score.score}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {average != null ? (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="size-3 fill-current text-amber-500" />
                        {average.toFixed(1)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}

      <VariantDetailSheet variantId={openVariantId} onClose={() => setOpenVariantId(null)} />
    </div>
  )
}
