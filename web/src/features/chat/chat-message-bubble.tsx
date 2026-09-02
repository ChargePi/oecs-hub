import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RotateCcw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { clarifyingQuestionsFromMetadata, comparisonTableFromMetadata } from '@/lib/chat/client'
import type { ChatMessage, SelectedChoice } from '@/lib/chat/types'
import { ChatClarifyForm } from './chat-clarify-form'
import { ChatComparisonTable } from './chat-comparison-table'

const CLARIFY_INTRO =
  'To find the best match among thousands of chargers, please answer a few quick questions:'

// Sparse on purpose - the agent's replies use headings/bold/lists/links, not the full
// CommonMark surface, and this stays a chat bubble rather than growing a typography
// plugin's worth of styling.
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
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>,
  // GFM pipe tables (remarkGfm below) - plain react-markdown parses these as inert
  // text otherwise. Wrapped in its own scroll container since a wide table would
  // otherwise force the whole chat bubble wider than its max-width.
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border px-2 py-1 align-top">{children}</td>,
}

export function ChatMessageBubble({
  message,
  isLast,
  disabled,
  onSubmitClarification,
  historicalSelectedChoices,
  resendMessage,
  onResend,
}: {
  message: ChatMessage
  /** Only the most recent clarification prompt is answerable - an earlier one (from an
   *  earlier round of the same loop) has already been superseded, and renders
   *  read-only via historicalSelectedChoices instead. */
  isLast?: boolean
  disabled?: boolean
  onSubmitClarification?: (summary: string, choices: SelectedChoice[]) => void
  /** For an earlier, already-answered clarification prompt (isLast false): the
   *  choices the user actually picked, read from that prompt's reply message (see
   *  selectedChoicesFromMetadata) - renders the prompt read-only with those checked
   *  instead of falling back to its raw "- [ ] Label" markdown content. Ignored when
   *  isLast, since that prompt renders as the live, still-answerable form instead. */
  historicalSelectedChoices?: SelectedChoice[]
  /** The user message that triggered this reply, for a failed response's own Resend
   *  (see canResend below - a successful response doesn't get one; Resend lives on
   *  the request itself then). Unused when message is already the user message. */
  resendMessage?: ChatMessage
  /** Loads a request's text into the composer for the user to review/edit - does
   *  NOT send it itself, so nothing ever gets silently resent without the user
   *  explicitly pressing Send again. Shown on every request (isUser), and on a
   *  response only when it failed (paired with resendMessage, the request that
   *  produced it) - a successful response doesn't need its own, since it's already
   *  right below its resendable request. */
  onResend?: (text: string) => void
}) {
  const isUser = message.role === 'MESSAGE_ROLE_USER'
  const isSystemLike =
    message.role === 'MESSAGE_ROLE_SYSTEM' || message.role === 'MESSAGE_ROLE_TOOL'
  // Set by the agent workflow when a pipeline step irrecoverably fails and it persists
  // a generic apology in place of a real answer - flags it instead of presenting it
  // like a normal reply.
  const failed = message.metadata?.failed === true
  // Set when the request was too broad to narrow down among 10,000+ chargers -
  // clarifying_questions is always multiple-choice, so this renders as a checkbox form
  // rather than the message's own Markdown content, which would otherwise duplicate it
  // as prose.
  const needsClarification = message.metadata?.needs_clarification === true
  const clarifyingQuestions = needsClarification
    ? clarifyingQuestionsFromMetadata(message.metadata)
    : []
  const showLiveClarifyForm = isLast && clarifyingQuestions.length > 0 && onSubmitClarification
  const showClarifyHistory = !isLast && clarifyingQuestions.length > 0
  const showClarifyForm = showLiveClarifyForm || showClarifyHistory
  // Set for a compare_chargers answer - purely informational, so (unlike the clarify
  // form) it renders the same regardless of isLast.
  const comparisonTable = comparisonTableFromMetadata(message.metadata)
  const showComparisonTable = !isUser && comparisonTable !== undefined
  const isWide = showClarifyForm || showComparisonTable
  // Resend lives on the request, not the response - a response only gets its own
  // when it failed, since then the request just above it doesn't visually read as
  // "the thing to resend" the way a warning-flagged reply does.
  const canResend = isUser
    ? !!onResend
    : failed && !!onResend && resendMessage?.role === 'MESSAGE_ROLE_USER'
  const resendText = isUser ? message.content : resendMessage?.content

  if (isSystemLike) {
    return (
      <p className="mx-auto max-w-md text-center text-xs text-muted-foreground">
        {message.content}
      </p>
    )
  }

  return (
    <div className={cn('group/msg flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm',
          isWide ? 'max-w-[90%]' : 'max-w-[75%]',
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
            ) : showClarifyForm ? (
              <div className="flex flex-col gap-3">
                <p>{CLARIFY_INTRO}</p>
                <ChatClarifyForm
                  questions={clarifyingQuestions}
                  disabled={disabled}
                  onSubmit={showLiveClarifyForm ? onSubmitClarification : undefined}
                  selectedChoices={
                    showLiveClarifyForm ? undefined : (historicalSelectedChoices ?? [])
                  }
                />
              </div>
            ) : showComparisonTable ? (
              <div className="flex flex-col gap-3">
                <ChatComparisonTable table={comparisonTable} />
                <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {message.content}
                </Markdown>
              </div>
            ) : (
              <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                {message.content}
              </Markdown>
            )}
            {!isUser && canResend && (
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onResend!(resendText!)}
                className="mt-2 w-fit gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-500"
              >
                <RotateCcw />
                Resend
              </Button>
            )}
          </div>
        </div>
      </div>
      {isUser && canResend && (
        // Invisible until the message is hovered/focused (ChatGPT-style row below the
        // bubble) - opacity-only (not conditionally rendered) so the row's height is
        // always reserved and nothing shifts when it appears.
        <div className="flex opacity-0 transition-opacity group-hover/msg:opacity-100 group-focus-within/msg:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onResend!(resendText!)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Resend
          </Button>
        </div>
      )}
    </div>
  )
}
