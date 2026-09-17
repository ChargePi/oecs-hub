import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIdentity } from '@/lib/auth/use-identity'
import type { ChargerVariant } from '@/lib/oecs/types'
import { useToastAction } from '@/lib/use-toast-action'
import { favoriteCharger, listFavorites } from '@/lib/user-chargers/client'

// A page of 200 covers the practical size of a personal favorites list in one round trip -
// there's no dedicated "is this one favorited?" RPC, so this is the cheapest way to answer
// that for a single product page without a bespoke endpoint. Shares its query key's prefix
// with FavoritesSegment's list so a toggle invalidates both.
const FAVORITE_IDS_PAGE_SIZE = 200

function useFavoriteIds(enabled: boolean) {
  return useQuery({
    queryKey: ['user-chargers', 'favorite-ids'],
    queryFn: async () => {
      const page = await listFavorites({ pageSize: FAVORITE_IDS_PAGE_SIZE })
      return new Set(page.favorites.map((f) => f.charger.id))
    },
    enabled,
  })
}

export function FavoriteButton({ variant }: { variant: ChargerVariant }) {
  const { identity } = useIdentity()
  const queryClient = useQueryClient()
  const { run, isPending } = useToastAction()

  const enabled = identity?.userType === 'individual'
  const { data: favoriteIds } = useFavoriteIds(enabled)

  if (!enabled) return null

  const isFavorited = favoriteIds?.has(variant.id) ?? false

  async function handleToggle() {
    const result = await run(() => favoriteCharger(variant.id, !isFavorited))
    if (result !== undefined) {
      await queryClient.invalidateQueries({ queryKey: ['user-chargers', 'favorite-ids'] })
      await queryClient.invalidateQueries({ queryKey: ['user-chargers', 'favorites'] })
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-primary/10 hover:text-primary"
          disabled={isPending}
          onClick={handleToggle}
          aria-label={
            isFavorited
              ? `Remove ${variant.model.name} from favorites`
              : `Add ${variant.model.name} to favorites`
          }
        >
          <Heart className={isFavorited ? 'fill-primary text-primary' : ''} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
    </Tooltip>
  )
}
