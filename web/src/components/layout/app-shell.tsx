import { lazy, Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'

import { SupportChatWidget } from '@/features/support-chat/support-chat-widget'
import { CHAT_ENABLED } from '@/lib/chat/config'
import {
  usePreferences,
  useEffectiveChatLayout,
  usePreferencesSync,
} from '@/lib/preferences/use-preferences'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

import { Header } from './header'

const ChatDrawer = lazy(() =>
  import('@/features/chat/chat-drawer').then((m) => ({ default: m.ChatDrawer })),
)

export function AppShell() {
  usePreferencesSync()
  const { language } = usePreferences()
  const drawerLayout = useEffectiveChatLayout() === 'drawer'
  const chatOpen = useChatDrawerStore((s) => s.open) && drawerLayout && CHAT_ENABLED

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SupportChatWidget />
      <div className="flex flex-1">
        <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
        {/* Outside the Outlet so the drawer, and any reply it's streaming, survives navigation. */}
        {chatOpen && (
          <Suspense fallback={null}>
            <ChatDrawer />
          </Suspense>
        )}
      </div>
    </div>
  )
}
