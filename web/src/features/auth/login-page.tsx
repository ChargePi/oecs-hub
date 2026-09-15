import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router'
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
  const navigate = useNavigate()

  // The card's own "Sign up" link is plain markup (not a flow UI node, so it can't be
  // swapped via the `components` prop) pointing straight at Kratos's registration-flow-init
  // endpoint - clicking it would create a flow against the default schema immediately,
  // before RegisterPage's account-type picker ever runs. Intercept it via delegation and
  // route to our own picker instead, so no flow exists until a type is actually chosen.
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest('a')
    if (anchor?.getAttribute('href')?.includes('/self-service/registration/browser')) {
      e.preventDefault()
      navigate('/auth/register')
    }
  }

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16" onClick={handleClick}>
      <Login flow={flow} config={oryClientConfiguration} onSuccess={onSuccess} />
    </div>
  )
}
