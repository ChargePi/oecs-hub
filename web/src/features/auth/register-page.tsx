import { useState } from 'react'
import { Registration } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import type { AccountType } from '@/lib/auth/types'
import { AccountTypeSelector } from './account-type-selector'
import { AuthFlowError } from './auth-flow-error'
import { useAuthSuccess } from './use-auth-success'
import { useFlow } from './use-flow'

export function RegisterPage() {
  const onSuccess = useAuthSuccess()
  const [accountType, setAccountType] = useState<AccountType>('manufacturer')

  // identitySchema picks which of the two Kratos schemas
  // (identity.manufacturer.schema.json / identity.individual.schema.json) this flow's
  // fields come from - each already contains only its own type's fields. recreateOn:
  // [accountType] so switching the selector starts a fresh flow against the new schema
  // rather than re-rendering fields that don't apply to it - see use-flow.ts's own
  // comment on recreateOn.
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRegistrationFlow({ identitySchema: accountType }),
    (id) => frontendApi.getRegistrationFlow({ id }),
    [accountType],
  )

  // Sync once per new flow, not on every mismatch: after the user switches accountType,
  // `flow` briefly still holds the previous schema's flow until the refetch (triggered by
  // useFlow's recreateOn) resolves - during that gap flow.identity_schema legitimately
  // differs from accountType, and correcting accountType back to match flow every render
  // would fight the user's click and make the selector look unresponsive. Keying off
  // flow.id (React's "adjusting state based on a prop" pattern) instead of a plain
  // mismatch check means this only fires when a genuinely new flow object arrives - most
  // importantly when resuming via `?flow=` (e.g. back from Google OIDC needing missing
  // traits), where that flow was already created against a specific schema, possibly not
  // today's default 'manufacturer'.
  const [syncedFlowId, setSyncedFlowId] = useState<string | null>(null)
  if (flow && flow.id !== syncedFlowId) {
    setSyncedFlowId(flow.id)
    if (flow.identity_schema && flow.identity_schema !== accountType) {
      setAccountType(flow.identity_schema as AccountType)
    }
  }

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <AccountTypeSelector value={accountType} onChange={setAccountType} />
      {/* key={flow.id}, not key={accountType}: Registration is a stateful all-in-one
          form component that captures its node list on mount and ignores later prop
          changes, so it must only remount once a flow scoped to the new schema has
          actually arrived - keying on accountType instead would remount one render too
          early (accountType updates before the refetch resolves), permanently baking in
          the previous schema's fields under the newly-selected type's label. */}
      <Registration key={flow.id} flow={flow} config={oryClientConfiguration} onSuccess={onSuccess} />
    </div>
  )
}
