import { ConversationList } from './conversation-list'
import { ChatPanel } from './chat-drawer'
import { useChatDeepLink } from './use-chat-deep-link'

export function ChatPage() {
  useChatDeepLink()

  return (
    <div className="mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-7xl min-h-0">
      <aside
        className="hidden w-72 shrink-0 flex-col border-r border-border lg:flex"
        aria-label="Conversations"
      >
        <ConversationList />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatPanel />
      </div>
    </div>
  )
}
