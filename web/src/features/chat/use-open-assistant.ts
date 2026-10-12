import { useLocation, useNavigate } from 'react-router'

import { useEffectiveChatLayout } from '@/lib/preferences/use-preferences'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

export function useOpenAssistant() {
  const layout = useEffectiveChatLayout()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const drawerOpen = useChatDrawerStore((s) => s.open)
  const onChatPage = pathname === '/chat' || pathname.startsWith('/chat/')

  function goToPage() {
    if (!onChatPage) navigate('/chat')
  }

  return {
    isOpen: layout === 'page' ? onChatPage : drawerOpen,
    open: () => {
      useChatDrawerStore.getState().setOpen(true)
      if (layout === 'page') goToPage()
    },
    toggle: () => {
      if (layout === 'page') goToPage()
      else useChatDrawerStore.getState().toggle()
    },
    ask: (prompt: string, chargerIds?: string[]) => {
      useChatDrawerStore.getState().ask(prompt, chargerIds)
      if (layout === 'page') goToPage()
    },
  }
}
