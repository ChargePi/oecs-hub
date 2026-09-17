import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'

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
import { useToastAction } from '@/lib/use-toast-action'
import { favoriteCharger, listFavorites } from '@/lib/user-chargers/client'
import { VariantDetailSheet } from '@/features/product/variant-detail-sheet'

const PAGE_SIZE = 20

export function FavoritesSegment() {
  const queryClient = useQueryClient()
  const { run } = useToastAction()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [openVariantId, setOpenVariantId] = useState<string | null>(null)

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['user-chargers', 'favorites'],
      queryFn: ({ pageParam }) => listFavorites({ pageSize: PAGE_SIZE, pageToken: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    })

  useEffect(() => {
    if (error instanceof AuthRequiredError) redirectToLogin()
  }, [error])

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const favorites = data?.pages.flatMap((page) => page.favorites) ?? []

  async function handleUnfavorite(chargerId: string) {
    setPendingId(chargerId)
    const result = await run(() => favoriteCharger(chargerId, false))
    if (result !== undefined) {
      await queryClient.invalidateQueries({ queryKey: ['user-chargers', 'favorites'] })
    }
    setPendingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Charger</TableHead>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Favorited</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isError || favorites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                {isError ? (
                  "Favorites aren't available right now."
                ) : (
                  <span className="flex flex-col items-center gap-2">
                    <Heart className="size-6" aria-hidden="true" />
                    You haven't favorited any chargers yet.
                  </span>
                )}
              </TableCell>
            </TableRow>
          ) : (
            favorites.map((favorite) => {
              const isPending = pendingId === favorite.charger.id

              return (
                <TableRow key={favorite.charger.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => setOpenVariantId(favorite.charger.id)}
                    >
                      {favorite.charger.model.name}
                    </button>
                  </TableCell>
                  <TableCell>{favorite.charger.manufacturer.name}</TableCell>
                  <TableCell>{new Date(favorite.favoritedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleUnfavorite(favorite.charger.id)}
                    >
                      {isPending ? 'Removing…' : 'Remove'}
                    </Button>
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
