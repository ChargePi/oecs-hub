import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

import type { ChatMessage } from '@/lib/chat/types'
import { ChatMessageBubble } from './chat-message-bubble'

export function ChatMessageList({
  messages,
  isStreaming,
}: {
  messages: ChatMessage[]
  isStreaming: boolean
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, isStreaming])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
