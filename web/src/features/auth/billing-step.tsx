import { useEffect, useState } from 'react'
import { CreditCard, Gift, Loader2 } from 'lucide-react'

import { getPaymentPortalUrl } from '@/lib/billing/client'
import type { PlanTier } from '@/lib/billing/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BillingStepProps {
  tier: PlanTier | null
  planName: string | null
  onFinish: () => void
}

// Card/payment details are collected in Lago's own hosted portal, never in our own
// form (see registration-wizard.tsx's header comment) - a paid signup is otherwise
// stuck the moment it lands in the app with no way to actually pay yet, so a paid tier
// redirects the browser there directly (not a new tab - an actual navigation away),
// rather than leaving the user on this page hoping they notice a popup. Same card shell
// as AccountTypeSelector/PlanStep (border/rounded-xl, centered) - unselected/neutral,
// not the primary-tinted "selected" look those use, since there's nothing to pick here.
export function BillingStep({ tier, planName, onFinish }: BillingStepProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (tier !== 'paid') return
    let cancelled = false

    getPaymentPortalUrl()
      .then((portalUrl) => {
        if (cancelled) return
        setUrl(portalUrl)
        window.location.href = portalUrl
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [tier])

  const Icon = tier === 'paid' ? CreditCard : Gift

  return (
    <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-border/60 px-3 py-6 text-center">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-lg font-bold text-foreground">
        {tier === 'paid' ? 'Add a payment method' : "You're all set!"}
      </span>
      {planName && <span className="text-sm font-medium text-primary">{planName}</span>}

      <p className={cn('text-xs text-muted-foreground', tier === 'paid' && 'mt-1')}>
        {tier !== 'paid'
          ? 'Your account is ready to go.'
          : error
            ? "Couldn't reach the payment portal automatically - you can add a payment method any time from Profile > Billing."
            : 'Taking you to the payment portal...'}
      </p>

      {tier === 'paid' && !error && (
        <Loader2 className="mt-1 size-5 animate-spin text-muted-foreground" aria-hidden="true" />
      )}
      {tier === 'paid' && url && (
        <a
          href={url}
          className="mt-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Continue to payment portal
        </a>
      )}

      <Button size="lg" onClick={onFinish} className="mt-4">
        {tier === 'paid' ? 'Skip for now' : 'Continue'}
      </Button>
    </div>
  )
}
