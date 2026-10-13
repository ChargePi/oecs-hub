import { useEffect } from 'react'
import { Login } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { useIdentity } from '@/lib/auth/use-identity'
import { loginComponents } from './auth-overrides'
import { AuthFlowError } from './auth-flow-error'
import { AuthFormSkeleton, AuthLayout } from './auth-layout'
import { useAuthSuccess } from './use-auth-success'
import { useFlow } from './use-flow'

export function LoginPage() {
  const { identity, isLoading: isIdentityLoading } = useIdentity()
  const onSuccess = useAuthSuccess()

  // Landing here already logged in (stale link, or a page redirecting here off a session
  // check that raced/misfired) - Kratos refuses to init a login flow in that case
  // ("session_already_available"), so treat it as a successful login instead of ever
  // asking Kratos for one.
  useEffect(() => {
    if (identity) onSuccess()
  }, [identity, onSuccess])

  const { flow, error } = useFlow(
    () => frontendApi.createBrowserLoginFlow(),
    (id) => frontendApi.getLoginFlow({ id }),
    [],
    !isIdentityLoading && !identity,
  )

  if (error) return <AuthFlowError />
  return (
    <AuthLayout title="Log in to OECS Hub" split>
      {flow ? (
        <Login
          flow={flow}
          config={oryClientConfiguration}
          components={loginComponents}
          onSuccess={onSuccess}
        />
      ) : (
        <AuthFormSkeleton />
      )}
    </AuthLayout>
  )
}
