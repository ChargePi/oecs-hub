import { Recovery } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { AuthFlowError } from './auth-flow-error'
import { useFlow } from './use-flow'

export function RecoveryPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRecoveryFlow(),
    (id) => frontendApi.getRecoveryFlow({ id }),
  )

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <Recovery flow={flow} config={oryClientConfiguration} />
    </div>
  )
}
