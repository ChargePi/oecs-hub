import { Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { RATING_CATEGORIES } from '@/lib/oecs/rating-categories'
import type { CategoryRating } from '@/lib/oecs/types'
import { SpecRow, SpecSection } from './spec-section'

function displayInfo(categoryName: string) {
  const known = RATING_CATEGORIES.find((c) => c.name === categoryName)
  return known ?? { name: categoryName, label: categoryName, description: undefined }
}

function orderRatings(ratings: CategoryRating[]): CategoryRating[] {
  const byName = new Map(ratings.map((r) => [r.categoryName, r]))
  const ordered: CategoryRating[] = []

  for (const { name } of RATING_CATEGORIES) {
    const rating = byName.get(name)
    if (rating) {
      ordered.push(rating)
      byName.delete(name)
    }
  }

  ordered.push(...byName.values())

  return ordered
}

function ratingBadge(rating: CategoryRating) {
  return (
    <Badge variant="outline" className="gap-1">
      <Star className="size-3 fill-current text-amber-500" />
      {rating.average.toFixed(1)} · {rating.count} rating{rating.count === 1 ? '' : 's'}
    </Badge>
  )
}

/** Individual-submitted ratings for a charger, always the last section in the charger detail
 *  drawer and comparison view - see ProductDetail / comparison-rows.tsx. */
export function RatingsSection({ ratings }: { ratings: CategoryRating[] }) {
  if (ratings.length === 0) {
    return (
      <SpecSection title="Ratings" icon={Star}>
        <p className="col-span-full text-sm text-muted-foreground">No ratings yet.</p>
      </SpecSection>
    )
  }

  return (
    <SpecSection title="Ratings" icon={Star}>
      {orderRatings(ratings).map((rating) => {
        const { label, description } = displayInfo(rating.categoryName)
        return (
          <SpecRow
            key={rating.categoryName}
            label={label}
            description={description}
            value={ratingBadge(rating)}
            inline
          />
        )
      })}
    </SpecSection>
  )
}
