import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/chat/types'

// Sparse on purpose - the agent's replies use headings/bold/lists/links (see
// oecs-recommendation-agent's prompts), not the full CommonMark surface, and this
// stays a chat bubble rather than growing a typography plugin's worth of styling.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-primary"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>
  ),
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'MESSAGE_ROLE_USER'
  const isSystemLike =
    message.role === 'MESSAGE_ROLE_SYSTEM' || message.role === 'MESSAGE_ROLE_TOOL'
  // Set by the agent workflow when a pipeline step irrecoverably fails and it persists
  // a generic apology in place of a real answer (see oecs-recommendation-agent's
  // workflow.failureOutput) - flags it instead of presenting it like a normal reply.
  const failed = message.metadata?.failed === true

  if (isSystemLike) {
    return (
      <p className="mx-auto max-w-md text-center text-xs text-muted-foreground">
        {message.content}
      </p>
    )
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
            : 'border border-border bg-card text-card-foreground',
          failed && 'border-amber-500/50',
        )}
      >
        <div className={cn(failed && 'flex items-start gap-2')}>
          {failed && <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />}
          <div className="min-w-0">
            {isUser ? (
              message.content
            ) : (
              <Markdown components={MARKDOWN_COMPONENTS}>{message.content}</Markdown>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
