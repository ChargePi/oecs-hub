import { Login } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { AuthFlowError } from './auth-flow-error'
import { useAuthSuccess } from './use-auth-success'
import { useFlow } from './use-flow'

export function LoginPage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserLoginFlow(),
    (id) => frontendApi.getLoginFlow({ id }),
  )
  const onSuccess = useAuthSuccess()

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <Login flow={flow} config={oryClientConfiguration} onSuccess={onSuccess} />
    </div>
  )
}
