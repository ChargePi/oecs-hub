import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StarRatingInput } from '@/components/ui/star-rating-input'
import { loginRedirect, useIdentity } from '@/lib/auth/use-identity'
import { RATING_CATEGORIES } from '@/lib/oecs/rating-categories'
import { registryClient } from '@/lib/registry/client'

type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error'; message: string }

export function RateVariantControl({ variantId }: { variantId: string }) {
  const { identity, isLoading } = useIdentity()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' })

  if (isLoading) return null

  if (!identity) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        <Link
          to={loginRedirect(location.pathname, location.search)}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>{' '}
        to rate this charger.
      </p>
    )
  }

  if (identity.userType !== 'individual') {
    return (
      <p className="text-sm text-muted-foreground">
        Rating a charger is only available to individual accounts.
      </p>
    )
  }

  function openSheet() {
    setScores({})
    setSubmitState({ status: 'idle' })
    setOpen(true)
  }

  async function handleSubmit() {
    const ratings = Object.entries(scores).map(([categoryName, score]) => ({ categoryName, score }))
    if (ratings.length === 0) return

    setSubmitState({ status: 'submitting' })

    try {
      await registryClient.submitVariantRating(variantId, ratings)
      await queryClient.invalidateQueries({ queryKey: ['variant', variantId] })
      setOpen(false)
    } catch (err) {
      setSubmitState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Submission failed.',
      })
    }
  }

  const canSubmit = Object.keys(scores).length > 0 && submitState.status !== 'submitting'

  return (
    <>
      <Button variant="outline" size="sm" className="w-fit" onClick={openSheet}>
        <Star className="size-4" />
        Rate this charger
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Rate this charger</SheetTitle>
            <SheetDescription>
              Score any categories you have an opinion on - the rest are left as-is.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-4">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.name} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{category.label}</p>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                <StarRatingInput
                  value={scores[category.name] ?? 0}
                  onChange={(score) =>
                    setScores((prev) => ({ ...prev, [category.name]: score }))
                  }
                  aria-label={category.label}
                />
              </div>
            ))}

            {submitState.status === 'error' && (
              <p className="text-sm text-destructive">{submitState.message}</p>
            )}

            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitState.status === 'submitting' ? 'Submitting…' : 'Submit rating'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
