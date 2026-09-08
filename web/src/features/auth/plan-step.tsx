import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { getPlans } from '@/lib/billing/client'
import type { Plan, PlanTier } from '@/lib/billing/types'
import type { AccountType } from '@/lib/auth/types'
import { cn } from '@/lib/utils'

interface PlanStepProps {
  accountType: AccountType
  selectedCode: string | null
  onSelect: (code: string, tier: PlanTier) => void
}

function formatPrice(plan: Plan): string {
  if (plan.tier === 'free' || plan.amountCents === 0) return 'Free'
  const amount = (plan.amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: plan.currency || 'EUR',
  })
  return `${amount} / ${plan.interval}`
}

// Narrows GetPlans's 4 results down to the 2 matching the account type chosen at step 1.
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
    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Plan">
      {available.map((plan) => {
        const selected = plan.code === selectedCode
        return (
          <button
            key={plan.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(plan.code, plan.tier)}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
              selected
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <span className="font-medium">{plan.displayName}</span>
            <span className="text-muted-foreground">{formatPrice(plan)}</span>
          </button>
        )
      })}
    </div>
  )
}
