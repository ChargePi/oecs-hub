import { useEffectiveChatLayout } from '@/lib/preferences/use-preferences'

import { ChatPage } from './chat-page'
import { ChatRedirect } from './chat-redirect'

export function ChatRoute() {
  return useEffectiveChatLayout() === 'page' ? <ChatPage /> : <ChatRedirect />
}
