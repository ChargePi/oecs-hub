import { useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2 } from 'lucide-react'

import { selectedChoicesFromMetadata } from '@/lib/chat/client'
import type { ChatMessage, SelectedChoice } from '@/lib/chat/types'
import { MARKDOWN_COMPONENTS } from './chat-markdown'
import { ChatMessageBubble } from './chat-message-bubble'

/** The reply while it's still streaming in - not yet a real ChatMessage, so no
 *  feedback/resend/clarify-form. Replaced by ChatMessageBubble on onDone. */
function LiveAssistantBubble({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[75%] rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
        <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {text}
        </Markdown>
        <span
          aria-hidden
          className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-text-bottom"
        />
      </div>
    </div>
  )
}

export function ChatMessageList({
  messages,
  isStreaming,
  streamingText,
  onSubmitClarification,
  onResend,
}: {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingText: string
  onSubmitClarification?: (summary: string, choices: SelectedChoice[]) => void
  /** Loads a failed message's originating user turn into the composer - see
   *  ChatMessageBubble's onResend. */
  onResend?: (text: string) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, isStreaming, streamingText])

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

        {isStreaming &&
          (streamingText ? (
            <LiveAssistantBubble text={streamingText} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Thinking…
            </div>
          ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
