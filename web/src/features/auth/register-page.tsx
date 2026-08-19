import type { RegistrationFlow } from '@ory/client-fetch'
import { Registration } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { hideUserTypeNode } from '@/lib/kratos-ui-nodes'
import { AccountTypeSelector } from './account-type-selector'
import { AuthFlowError } from './auth-flow-error'
import { useAuthSuccess } from './use-auth-success'
import { useFlow } from './use-flow'

// AccountTypeSelector above the form is presentational only (see its own comment) -
// userType is fixed by the schema regardless, so it's hidden from the rendered form here.
function hideUserTypeField(flow: RegistrationFlow): RegistrationFlow {
  return { ...flow, ui: { ...flow.ui, nodes: flow.ui.nodes.map(hideUserTypeNode) } }
}

export function RegisterPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRegistrationFlow(),
    (id) => frontendApi.getRegistrationFlow({ id }),
  )
  const onSuccess = useAuthSuccess()

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <AccountTypeSelector />
      <Registration flow={hideUserTypeField(flow)} config={oryClientConfiguration} onSuccess={onSuccess} />
    </div>
  )
}
