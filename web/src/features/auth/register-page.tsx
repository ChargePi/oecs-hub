import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Registration } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import type { AccountType } from '@/lib/auth/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AccountTypeSelector } from './account-type-selector'
import { AuthFlowError } from './auth-flow-error'
import { RegistrationLayout } from './registration-layout'
import { REGISTRATION_STEP_LABELS } from './registration-steps'
import { RegistrationWizard } from './registration-wizard'
import { RequiredLabel } from './required-label'
import { useFlow } from './use-flow'

// sessionStorage key for the {flowId, accountType} pair stashed just before a full-page
// redirect away to an OIDC provider mid-registration (see the isResuming comment below).
const PENDING_KEY = 'oecs.registration.pending'

function readPending(): { flowId: string; accountType: AccountType } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}


export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const flowId = searchParams.get('flow')

  // `?flow=` alone doesn't mean "resume" - Kratos's own generic sign-up link
  // (/ory/self-service/registration/browser, e.g. the Login page's "Sign up" link) also
  // 303s here with a fresh `?flow=` against the default schema, and that case must still
  // show the picker. Only treat it as resuming when the flow id matches what *this* page
  // stashed right before redirecting to an OIDC provider mid-registration - i.e. a real
  // return trip from Google, not an arrival from outside.
  const pending = flowId ? readPending() : null
  const isResuming = flowId !== null && pending?.flowId === flowId

  const [accountType, setAccountType] = useState<AccountType>(
    isResuming && pending ? pending.accountType : 'manufacturer',
  )
  // Once true, never goes back to false - gates flow creation for good, so the flow
  // stays alive (just CSS-hidden, see `view` below) when the user clicks back to
  // Account type in the breadcrumb, instead of being torn down and refetched.
  const [confirmed, setConfirmed] = useState(isResuming)
  // What's currently visible - 1: account type, 2: general info, 3: plan. Deliberately
  // separate from `confirmed`: stepping back to 1 must not touch the underlying flow.
  const [view, setView] = useState<1 | 2 | 3>(isResuming ? 2 : 1)

  // Ref, not state: read by transientPayload's function form at submit time, not via re-render.
  const planCodeRef = useRef<string | null>(null)

  const handlePlanSelect = useCallback((code: string) => {
    planCodeRef.current = code
  }, [])

  // Just cleanup: navigation from here is entirely Kratos's own doing.
  // <Registration>'s built-in submit handler hard-redirects the browser via Kratos's
  // `continue_with: redirect_browser_to` the instant the flow succeeds - regardless of
  // what this callback does (confirmed empirically) - to wherever kratos.yml's
  // registration.after.*.default_browser_return_url points (register-complete-page.tsx).
  // There's no "step 4" to show in-SPA here; see that page's own header comment.
  const handleSuccess = useCallback(() => {
    sessionStorage.removeItem(PENDING_KEY)
  }, [])

  // identitySchema picks the Kratos schema; recreateOn: [accountType] starts a fresh flow
  // when the type changes. enabled: confirmed - no flow until the picker step is done,
  // and (now that confirmed never reverts) never refetched again just from navigating
  // back to the picker and forward again with the same type.
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRegistrationFlow({ identitySchema: accountType }),
    (id) => frontendApi.getRegistrationFlow({ id }),
    [accountType],
    confirmed,
    isResuming ? flowId : null,
  )

  // Sync once per new flow (keyed on flow.id), not on every mismatch: avoids fighting the
  // brief gap after switching accountType where flow still holds the previous schema.
  const [syncedFlowId, setSyncedFlowId] = useState<string | null>(null)
  if (flow && flow.id !== syncedFlowId) {
    setSyncedFlowId(flow.id)
    if (flow.identity_schema && flow.identity_schema !== accountType) {
      setAccountType(flow.identity_schema as AccountType)
    }
    // Stashed so that if the user clicks "Sign in with Google" inside this flow (a
    // full-page redirect away and back), isResuming can recognize the return trip by
    // matching flow id instead of trusting any `?flow=` as a resume.
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ flowId: flow.id, accountType }))
  }

  function handleContinue() {
    setConfirmed(true)
    setView(2)
  }

  // Steps 1-3 are clickable - jumping ahead past the picker confirms it first (same as
  // clicking Continue), so 2/3 always have a flow to show by the time `view` gets there.
  // Step 4 (Billing) has no in-SPA view to jump to - it only exists as
  // register-complete-page.tsx, reached via a real submission - so it's a no-op here
  // rather than falling through to some other step (confirmed as a real bug: it used to
  // land on General info, since `step === 3 ? 3 : 2` silently treated "anything that
  // isn't 1 or 3" as "go to 2").
  function handleStepClick(step: number) {
    if (step === 1) {
      setView(1)
      return
    }
    if (step !== 2 && step !== 3) return
    if (!confirmed) setConfirmed(true)
    setView(step)
  }

  // A creation failure while actively viewing the picker (e.g. retrying after switching
  // account type) shouldn't block the picker itself - only block once they've moved past it.
  if (error && view !== 1) return <AuthFlowError />

  return (
    <RegistrationLayout
      currentStep={view}
      labels={REGISTRATION_STEP_LABELS}
      onStepClick={handleStepClick}
      wide={view === 3}
    >
      <div className={view === 1 ? 'contents' : 'hidden'}>
        <h1 className="text-center text-lg font-semibold">Choose your account type</h1>
        <AccountTypeSelector value={accountType} onChange={setAccountType} />
        <Button size="lg" onClick={handleContinue}>
          Continue
        </Button>
      </div>

      {confirmed && flow && (
        // key={flow.id}, not key={accountType}: Registration is a stateful all-in-one
        // form component that captures its node list on mount and ignores later prop
        // changes, so it must only remount once a flow scoped to the new schema has
        // actually arrived - keying on accountType instead would remount one render too
        // early (accountType updates before the refetch resolves), permanently baking in
        // the previous schema's fields under the newly-selected type's label.
        <div className={cn('oecs-auth-unboxed', view === 1 ? 'hidden' : 'contents')}>
          <Registration
            key={flow.id}
            flow={flow}
            config={oryClientConfiguration}
            components={{ Node: { Label: RequiredLabel } }}
            onSuccess={handleSuccess}
            transientPayload={() => (planCodeRef.current ? { plan_code: planCodeRef.current } : {})}
          >
            <RegistrationWizard
              accountType={accountType}
              onPlanSelect={handlePlanSelect}
              step={view === 3 ? 2 : 1}
              onStepChange={(wizardStep) => setView(wizardStep === 1 ? 2 : 3)}
            />
          </Registration>
        </div>
      )}
    </RegistrationLayout>
  )
}
