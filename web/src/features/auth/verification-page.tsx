import { Verification } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { authComponents } from './auth-overrides'
import { AuthFlowError } from './auth-flow-error'
import { AuthFormSkeleton, AuthLayout } from './auth-layout'
import { useFlow } from './use-flow'

export function VerificationPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserVerificationFlow(),
    (id) => frontendApi.getVerificationFlow({ id }),
  )

  if (error) return <AuthFlowError />
  return (
    <AuthLayout title="Verify your email">
      {flow ? (
        <Verification flow={flow} config={oryClientConfiguration} components={authComponents} />
      ) : (
        <AuthFormSkeleton />
      )}
    </AuthLayout>
  )
}
