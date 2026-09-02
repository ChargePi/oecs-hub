import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

import { selectedChoicesFromMetadata } from '@/lib/chat/client'
import type { ChatMessage, SelectedChoice } from '@/lib/chat/types'
import { ChatMessageBubble } from './chat-message-bubble'

export function ChatMessageList({
  messages,
  isStreaming,
  onSubmitClarification,
  onResend,
}: {
  messages: ChatMessage[]
  isStreaming: boolean
  onSubmitClarification?: (summary: string, choices: SelectedChoice[]) => void
  /** Loads a failed message's originating user turn into the composer - see
   *  ChatMessageBubble's onResend. */
  onResend?: (text: string) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, isStreaming])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6">
        {messages.map((message, i) => {
          // A clarification prompt's answer lives on the very next message (its
          // reply's own "selected_choices" metadata - see
          // selectedChoicesFromMetadata) - only meaningful for an earlier,
          // already-answered round; the live one (isLast) ignores this.
          const reply = messages[i + 1]
          const historicalSelectedChoices =
            reply?.role === 'MESSAGE_ROLE_USER' ? selectedChoicesFromMetadata(reply.metadata) : []

          return (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isLast={i === messages.length - 1}
              disabled={isStreaming}
              onSubmitClarification={onSubmitClarification}
              historicalSelectedChoices={historicalSelectedChoices}
              resendMessage={messages[i - 1]}
              onResend={onResend}
            />
          )
        })}

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
