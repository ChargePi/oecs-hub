import { useState } from 'react'
import type { RegistrationFlow } from '@ory/client-fetch'
import { Registration } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { filterAccountTypeNodes, hideUserTypeNode, type AccountType } from '@/lib/kratos-ui-nodes'
import { AccountTypeSelector } from './account-type-selector'
import { AuthFlowError } from './auth-flow-error'
import { useAuthSuccess } from './use-auth-success'
import { useFlow } from './use-flow'

// AccountTypeSelector above the form drives userType instead of the raw Kratos node:
// hides the account-type field itself and whichever of company.*/billingAddress.*
// doesn't apply to the selected type (both are always present in the raw flow - see
// kratos-ui-nodes.ts).
function prepareRegistrationFlow(flow: RegistrationFlow, accountType: AccountType): RegistrationFlow {
  return {
    ...flow,
    ui: {
      ...flow.ui,
      nodes: filterAccountTypeNodes(flow.ui.nodes, accountType).map((node) =>
        hideUserTypeNode(node, accountType),
      ),
    },
  }
}

export function RegisterPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRegistrationFlow(),
    (id) => frontendApi.getRegistrationFlow({ id }),
  )
  const onSuccess = useAuthSuccess()
  const [accountType, setAccountType] = useState<AccountType>('manufacturer')

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <AccountTypeSelector value={accountType} onChange={setAccountType} />
      {/* key={accountType}: Registration is a stateful all-in-one form component that
          captures its node list on mount - it has no reason to re-derive rendered fields
          just because the flow *prop* object changes reference (same flow.id) on every
          render. A remount forces it to re-initialize from the freshly filtered nodes,
          which is the only way switching account type actually swaps the visible
          company/billing-address fields. */}
      <Registration
        key={accountType}
        flow={prepareRegistrationFlow(flow, accountType)}
        config={oryClientConfiguration}
        onSuccess={onSuccess}
      />
    </div>
  )
}
