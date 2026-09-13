import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Registration } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { getPaymentPortalUrl } from '@/lib/billing/client'
import type { PlanTier } from '@/lib/billing/types'
import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import type { AccountType } from '@/lib/auth/types'
import { Button } from '@/components/ui/button'
import { AccountTypeSelector } from './account-type-selector'
import { AuthFlowError } from './auth-flow-error'
import { RegistrationWizard } from './registration-wizard'
import { RequiredLabel } from './required-label'
import { useAuthSuccess } from './use-auth-success'
import { useFlow } from './use-flow'

export function RegisterPage() {
  const onAuthSuccess = useAuthSuccess()
  const [searchParams] = useSearchParams()
  // ?flow= means Kratos already started this flow (e.g. resumed after Google OIDC) - skip the picker.
  const isResuming = searchParams.has('flow')

  const [accountType, setAccountType] = useState<AccountType>('manufacturer')
  // Gates flow creation until the user picks a type, so the default schema isn't silently used.
  const [confirmed, setConfirmed] = useState(isResuming)

  // Ref, not state: read by transientPayload's function form at submit time, not via re-render.
  const planCodeRef = useRef<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null)

  const handlePlanSelect = useCallback((code: string, tier: PlanTier) => {
    planCodeRef.current = code
    setSelectedTier(tier)
  }, [])

  // Paid plan: open Lago's hosted portal for card entry right after signup. Never blocks
  // navigation on failure - the portal is also reachable later from Profile > Billing.
  const handleSuccess = useCallback(async () => {
    if (selectedTier === 'paid') {
      try {
        const url = await getPaymentPortalUrl()
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (err) {
        console.error('failed to open payment portal after registration', err)
      }
    }
    onAuthSuccess()
  }, [selectedTier, onAuthSuccess])

  // identitySchema picks the Kratos schema; recreateOn: [accountType] starts a fresh flow
  // when the type changes. enabled: confirmed - no flow until the picker step is done.
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRegistrationFlow({ identitySchema: accountType }),
    (id) => frontendApi.getRegistrationFlow({ id }),
    [accountType],
    confirmed,
  )

  // Sync once per new flow (keyed on flow.id), not on every mismatch: avoids fighting the
  // brief gap after switching accountType where flow still holds the previous schema.
  const [syncedFlowId, setSyncedFlowId] = useState<string | null>(null)
  if (flow && flow.id !== syncedFlowId) {
    setSyncedFlowId(flow.id)
    if (flow.identity_schema && flow.identity_schema !== accountType) {
      setAccountType(flow.identity_schema as AccountType)
    }
  }

  if (!confirmed) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
        <h1 className="text-center text-lg font-semibold">Choose your account type</h1>
        <AccountTypeSelector value={accountType} onChange={setAccountType} />
        <Button size="lg" onClick={() => setConfirmed(true)}>
          Continue
        </Button>
      </div>
    )
  }

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      {/* Hidden while resuming: restarting would discard the in-progress social-login step. */}
      {!isResuming && (
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          className="self-start text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          &larr; Change account type
        </button>
      )}
      {/* key={flow.id}, not key={accountType}: Registration is a stateful all-in-one
          form component that captures its node list on mount and ignores later prop
          changes, so it must only remount once a flow scoped to the new schema has
          actually arrived - keying on accountType instead would remount one render too
          early (accountType updates before the refetch resolves), permanently baking in
          the previous schema's fields under the newly-selected type's label. */}
      <Registration
        key={flow.id}
        flow={flow}
        config={oryClientConfiguration}
        components={{ Node: { Label: RequiredLabel } }}
        onSuccess={handleSuccess}
        transientPayload={() => (planCodeRef.current ? { plan_code: planCodeRef.current } : {})}
      >
        <RegistrationWizard accountType={accountType} onPlanSelect={handlePlanSelect} />
      </Registration>
    </div>
  )
}
