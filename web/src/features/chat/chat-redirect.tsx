import { useEffect, useRef } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'

import { useChatDrawerStore } from '@/stores/chat-drawer-store'

/** Chat used to be its own page; /chat, /chat/:id and the /chat?prompt= handoff now
 *  open the drawer instead, then land on `from` (a same-origin path) or home. Kept so
 *  old links and bookmarks still work, and so the signed-out "Evaluate using AI"
 *  flow survives the trip through login (RequireAuth keeps the query string). */
export function ChatRedirect() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [params] = useSearchParams()
  // StrictMode runs effects twice; ask() mints a new draft each time.
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const store = useChatDrawerStore.getState()
    const prompt = params.get('prompt')
    if (conversationId) store.openConversation(conversationId)
    else if (prompt) store.ask(prompt, params.get('chargerIds')?.split(',').filter(Boolean))
    else store.setOpen(true)
  }, [conversationId, params])

  const from = params.get('from')
  const target = from?.startsWith('/') && !from.startsWith('//') ? from : '/'
  return <Navigate to={target} replace />
}
