import { Navigate, useSearchParams } from 'react-router'

import { useChatDeepLink } from './use-chat-deep-link'

/** Drawer layout: /chat links open the drawer, then land on `from` or home. */
export function ChatRedirect() {
  const [params] = useSearchParams()
  useChatDeepLink()

  const from = params.get('from')
  const target = from?.startsWith('/') && !from.startsWith('//') ? from : '/'
  return <Navigate to={target} replace />
}
