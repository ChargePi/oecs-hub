import { useEffect, useLayoutEffect, useState } from 'react'
import { Check, CreditCard, Gift, Loader2 } from 'lucide-react'

import { getPlans } from '@/lib/billing/client'
import type { Plan, PlanTier } from '@/lib/billing/types'
import type { AccountType } from '@/lib/auth/types'
import { cn } from '@/lib/utils'

interface PlanStepProps {
  accountType: AccountType
  selectedCode: string | null
  onSelect: (code: string, tier: PlanTier) => void
}

function priceHeadline(plan: Plan): string {
  if (plan.tier === 'free' || plan.amountCents === 0) return 'Free'
  return (plan.amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: plan.currency || 'EUR',
  })
}

function commitmentLine(plan: Plan): string {
  return plan.tier === 'paid' ? `Billed ${plan.interval}, cancel anytime` : 'No credit card required'
}

// GetPlans's `tokens` metric is the same one chat-access-gate.tsx reads from GetUsage
// (metrics.find(m => m.code === 'tokens')) - the one billable metric this system meters,
// spent by the AI chat feature (recommendations, charger comparisons, general EV/charger
// Q&A - see chat-access-gate.tsx's own "token allowance" copy). `includedUnits` is that
// metric's free monthly allowance; unset on a paid, pay-per-use plan, which is why
// "unlimited usage" is always true for those.
function usageLine(plan: Plan): string {
  if (plan.tier === 'paid') return 'Unlimited usage, billed per token'
  return plan.includedUnits !== undefined
    ? `${plan.includedUnits.toLocaleString()} tokens/month included`
    : 'Limited monthly usage'
}

// Real copy pulled from AccountTypeSelector's own description, not invented marketing -
// there's no backend "features" field to draw from, so this bullet is limited to
// something this app can actually back up.
function accountLine(accountType: AccountType): string {
  return accountType === 'manufacturer'
    ? 'List your charger models and manage your company profile'
    : 'Explore, compare, and rate chargers'
}

// Tailwind's built-in `animate-ping` scales up to 200% via its `ping` keyframe - fine
// for the tiny notification dot it's designed for, but on a card-sized element that
// blows up into a rectangle bleeding way outside the card (confirmed empirically: it
// reached past the card's own heading and buttons). A transitioned scale/opacity to a
// barely-bigger size reads as a "pulse" instead without needing a custom keyframe.
function RingPulse() {
  const [grown, setGrown] = useState(false)

  useLayoutEffect(() => {
    // rAF, not a same-tick state set: the transition only fires if the browser paints
    // the starting (scale-100) frame first, then sees the class change.
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary transition-all duration-500 ease-out',
        grown ? 'scale-105 opacity-0' : 'scale-100 opacity-100',
      )}
    />
  )
}

// Narrows GetPlans's 4 results down to the 2 matching the account type chosen at step 1.
// Deliberately NOT the same markup as AccountTypeSelector's cards anymore - a plan is a
// bigger decision (price, commitment, what you get) than a one-word account type, so it
// gets a fuller card (title/price/commitment/feature list) stacked one per row rather
// than the account-type picker's plain 2-up icon+label grid. Selected-state colors/radius
// still match (`!border-primary !bg-primary/15`, `!rounded-xl`), so it still reads as
// part of the same design system.
export function PlanStep({ accountType, selectedCode, onSelect }: PlanStepProps) {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    getPlans()
      .then((all) => {
        if (!cancelled) setPlans(all)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load plans right now. Please try again in a moment.
      </p>
    )
  }

  if (!plans) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading plans...
      </div>
    )
  }

  const available = plans.filter((p) => p.accountType === accountType)

  return (
    <div className="grid grid-cols-2 items-stretch gap-3" role="radiogroup" aria-label="Plan">
      {available.map((plan) => {
        const selected = plan.code === selectedCode
        const Icon = plan.tier === 'free' ? Gift : CreditCard
        return (
          <button
            key={plan.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(plan.code, plan.tier)}
            className={cn(
              // Each segment (header/price/features) carries its own vertical padding and
              // a divider below it, rather than one shared gap - that's what actually
              // reads as "distinct sections". Height now comes from real content
              // (icon badge, "What's included" label, breathing room between rows)
              // rather than a forced min-height centering two lines in a mostly-empty
              // box - that read as unbalanced dead space rather than "spacious".
              'relative flex h-full flex-col overflow-hidden border px-5 text-left transition-all',
              // `!` (important): plain border/bg/radius utilities lose here to Ory's own
              // lazily-loaded stylesheet (loads after ours, so an equal-specificity rule
              // there wins on source order alone - the same class of issue the
              // `body .oecs-auth-unboxed`/`.oecs-settings-wide` rules in index.css work
              // around) - confirmed empirically via getComputedStyle: unselected/selected
              // border/bg computed identical, and border-radius computed 0px (Ory's own
              // button reset), without `!`.
              '!rounded-xl',
              selected
                ? '!border-primary !bg-primary/10 shadow-lg shadow-primary/10'
                : '!border-border/60 !bg-card/40 hover:!border-border hover:!bg-muted/30 hover:shadow-md',
            )}
          >
            {/* Paid is the upsell - a one-shot ring pulse on selection calls it out
                (free doesn't need the same nudge). Remounts - so replays - each time
                `selected` flips true, since RingPulse is only ever rendered while true. */}
            {selected && plan.tier === 'paid' && <RingPulse key={plan.code} />}

            <div
              className={cn(
                'flex items-center gap-3 border-b py-8',
                selected ? 'border-primary/25' : 'border-border/60',
              )}
            >
              <div
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-lg',
                  selected ? 'bg-primary/20' : 'bg-muted',
                )}
              >
                <Icon
                  className={cn('size-5', selected ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden="true"
                />
              </div>
              <span className="text-lg leading-tight font-bold text-foreground">{plan.displayName}</span>
            </div>

            <div
              className={cn(
                'flex flex-col gap-2.5 border-b py-8',
                selected ? 'border-primary/25' : 'border-border/60',
              )}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-foreground">{priceHeadline(plan)}</span>
                {plan.tier === 'paid' && (
                  <span className="text-xs text-muted-foreground">/ {plan.interval}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{commitmentLine(plan)}</span>
            </div>

            <div className="flex flex-col gap-5 py-8">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                What&apos;s included
              </span>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground/90">
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {usageLine(plan)}
                  </div>
                  {/* Tokens are otherwise an opaque number - this is what they're actually
                      for, so "no usage cap"/"N tokens/month" reads as a real feature
                      instead of a meaningless quota. */}
                  <p className="pl-5 text-[11px] leading-snug text-muted-foreground">
                    Powers AI charger recommendations, comparisons, and EV knowledge chat
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/90">
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {accountLine(accountType)}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
