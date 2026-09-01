import { Verification } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { AuthFlowError } from './auth-flow-error'
import { useFlow } from './use-flow'

export function VerificationPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserVerificationFlow(),
    (id) => frontendApi.getVerificationFlow({ id }),
  )

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <Verification flow={flow} config={oryClientConfiguration} />
    </div>
  )
}
