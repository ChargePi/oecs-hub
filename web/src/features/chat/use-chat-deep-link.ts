import { useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { useChatDrawerStore } from '@/stores/chat-drawer-store'

export function useChatDeepLink() {
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
}
