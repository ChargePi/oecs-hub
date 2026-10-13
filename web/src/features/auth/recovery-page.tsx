import { Recovery } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { authComponents } from './auth-overrides'
import { AuthFlowError } from './auth-flow-error'
import { AuthFormSkeleton, AuthLayout } from './auth-layout'
import { useFlow } from './use-flow'

export function RecoveryPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserRecoveryFlow(),
    (id) => frontendApi.getRecoveryFlow({ id }),
  )

  if (error) return <AuthFlowError />
  return (
    <AuthLayout title="Reset your password">
      {flow ? (
        <Recovery flow={flow} config={oryClientConfiguration} components={authComponents} />
      ) : (
        <AuthFormSkeleton />
      )}
    </AuthLayout>
  )
}
