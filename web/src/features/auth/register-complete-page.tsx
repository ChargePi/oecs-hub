import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { Loader2 } from 'lucide-react'

import { BILLING_ENABLED } from '@/lib/billing/config'
import { getUsage } from '@/lib/billing/client'
import type { PlanTier } from '@/lib/billing/types'
import { useIdentity } from '@/lib/auth/use-identity'
import { BillingStep } from './billing-step'
import { REGISTRATION_STEP_LABELS } from './registration-steps'
import { RegistrationLayout } from './registration-layout'
import { useAuthSuccess } from './use-auth-success'

// Reached only via Kratos's own post-registration redirect (kratos.yml's
// registration.after.*.default_browser_return_url) - never rendered in-SPA as a step
// transition. That redirect is unavoidable: <Registration>'s built-in submit handler
// hard-navigates the browser via Kratos's `continue_with: redirect_browser_to` the
// instant the flow succeeds, regardless of this app's own onSuccess callback (confirmed
// empirically - setting React state there never got a chance to render before the
// browser was already gone). So this step can't be "step 4 of the wizard" in memory;
// it has to be its own page the identity is already authenticated on arrival at,
// re-deriving what it needs (the chosen plan's tier) from the backend rather than
// carrying any state across that hard navigation.
export function RegisterCompletePage() {
  const { identity, isLoading: identityLoading } = useIdentity()
  const onAuthSuccess = useAuthSuccess()

  const [tier, setTier] = useState<PlanTier | null>(null)
  const [planName, setPlanName] = useState<string | null>(null)
  const [checkedUsage, setCheckedUsage] = useState(false)

  useEffect(() => {
    if (!BILLING_ENABLED || !identity) return
    let cancelled = false

    getUsage()
      .then((usage) => {
        if (cancelled) return
        setTier(usage.tier ?? null)
        setPlanName(usage.planName || null)
      })
      .catch(() => {
        // Not provisioned yet - Kratos's after-registration webhook to
        // oecs-billing-service is known to intermittently miss (see kratos.yml).
        // Fall back to "no paid plan known" rather than blocking this page.
      })
      .finally(() => {
        if (!cancelled) setCheckedUsage(true)
      })

    return () => {
      cancelled = true
    }
  }, [identity])

  useEffect(() => {
    if (identity && !BILLING_ENABLED) onAuthSuccess()
  }, [identity, onAuthSuccess])

  if (identityLoading) return null
  // Direct/bookmarked visit with no session - nothing to show.
  if (!identity) return <Navigate to="/" replace />
  if (!BILLING_ENABLED) return null

  return (
    <RegistrationLayout currentStep={4} labels={REGISTRATION_STEP_LABELS}>
      {checkedUsage ? (
        <BillingStep tier={tier} planName={planName} onFinish={onAuthSuccess} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Finishing up...
        </div>
      )}
    </RegistrationLayout>
  )
}
