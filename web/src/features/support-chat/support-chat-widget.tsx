import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import { useSession } from '@/lib/auth/use-session'
import { CHAT_ENABLED } from '@/lib/chat/config'
import {
  CHATWOOT_BASE_URL,
  CHATWOOT_WEBSITE_TOKEN,
  SUPPORT_CHAT_ENABLED,
} from '@/lib/support-chat/config'
import { resetSupportChat, type ChatwootColorScheme } from '@/lib/support-chat/chatwoot'
import { buildChatwootContact } from '@/lib/support-chat/contact'
import { useSupportChatIdentity } from '@/lib/support-chat/use-support-chat-identity'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

const HIDDEN_PATH_PREFIXES = ['/auth']

let sdkRequested = false

function appColorScheme(): ChatwootColorScheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function loadChatwootSdk() {
  if (sdkRequested) return
  sdkRequested = true

  window.chatwootSettings = {
    position: 'right',
    type: 'standard',
    launcherTitle: 'Support',
    darkMode: appColorScheme(),
  }

  const script = document.createElement('script')
  script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
  script.async = true
  script.onload = () =>
    window.chatwootSDK?.run({ websiteToken: CHATWOOT_WEBSITE_TOKEN, baseUrl: CHATWOOT_BASE_URL })
  document.body.appendChild(script)
}

export function SupportChatWidget() {
  if (!SUPPORT_CHAT_ENABLED) return null
  return <ChatwootBridge />
}

function ChatwootBridge() {
  const { pathname } = useLocation()
  const { data: session, isSuccess } = useSession()
  const identity = session?.identity
  const { data: chatIdentity } = useSupportChatIdentity(identity?.id)
  // Its bubble would sit on top of the assistant drawer's composer.
  const assistantOpen = useChatDrawerStore((s) => s.open) && CHAT_ENABLED
  const [ready, setReady] = useState(() => !!window.$chatwoot)
  const identifiedAs = useRef<string | null>(null)

  useEffect(() => {
    const onReady = () => setReady(true)
    window.addEventListener('chatwoot:ready', onReady)
    loadChatwootSdk()
    return () => window.removeEventListener('chatwoot:ready', onReady)
  }, [])

  useEffect(() => {
    if (!ready || !isSuccess) return

    if (!session?.identity) {
      if (identifiedAs.current) resetSupportChat()
      identifiedAs.current = null
      return
    }

    const id = session.identity.id
    if (!chatIdentity || chatIdentity.identifier !== id) return
    if (identifiedAs.current === id) return

    const contact = buildChatwootContact(session, chatIdentity)
    window.$chatwoot?.setUser(id, contact.user)
    window.$chatwoot?.setCustomAttributes(contact.customAttributes)
    identifiedAs.current = id
  }, [ready, isSuccess, session, chatIdentity])

  useEffect(() => {
    if (!ready) return

    const sync = () => window.$chatwoot?.setColorScheme(appColorScheme())
    sync()

    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [ready])

  const hidden =
    assistantOpen ||
    HIDDEN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  useEffect(() => {
    if (ready) window.$chatwoot?.toggleBubbleVisibility(hidden ? 'hide' : 'show')
  }, [ready, hidden])

  return null
}
