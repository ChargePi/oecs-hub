import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { deleteMessageFeedback, submitMessageFeedback } from '@/lib/chat/client'
import type { ChatMessage, FeedbackRating, MessageFeedback } from '@/lib/chat/types'
import { useToastAction } from '@/lib/use-toast-action'
import { cn } from '@/lib/utils'
import { useChatStreamStore } from '@/stores/chat-stream-store'

const MAX_COMMENT_LENGTH = 2000

const RATINGS: { rating: FeedbackRating; label: string; Icon: typeof ThumbsUp }[] = [
  { rating: 'up', label: 'Good response', Icon: ThumbsUp },
  { rating: 'down', label: 'Bad response', Icon: ThumbsDown },
]

export function ChatMessageFeedback({ message }: { message: ChatMessage }) {
  const { run, isPending } = useToastAction()
  const [commentOpen, setCommentOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const feedback = message.feedback
  const setFeedback = (fb: MessageFeedback | undefined) =>
    useChatStreamStore.getState().setMessageFeedback(message.id, fb)

  async function save(next: MessageFeedback | undefined) {
    const previous = feedback
    setFeedback(next)
    const result = await run(async () => {
      if (!next) {
        await deleteMessageFeedback(message.conversationId, message.id)
        return null
      }
      return submitMessageFeedback(message.conversationId, message.id, next.rating, next.comment)
    })
    if (result === undefined) {
      setFeedback(previous)
      return false
    }
    if (result) setFeedback(result)
    return true
  }

  async function handleRate(rating: FeedbackRating) {
    if (feedback?.rating === rating) {
      setCommentOpen(false)
      await save(undefined)
      return
    }
    const comment = feedback?.comment ?? ''
    if (await save({ rating, comment })) {
      setDraft(comment)
      setCommentOpen(true)
    }
  }

  async function handleSendComment() {
    if (!feedback) return
    if (await save({ rating: feedback.rating, comment: draft.trim() })) setCommentOpen(false)
  }

  if (!message.conversationId) return null

  return (
    <div className="flex w-full max-w-[75%] flex-col gap-2">
      <div className="flex items-center gap-0.5">
        {RATINGS.map(({ rating, label, Icon }) => {
          const active = feedback?.rating === rating
          return (
            <Tooltip key={rating}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => void handleRate(rating)}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    active && 'text-foreground',
                  )}
                >
                  <Icon className={cn('size-3.5', active && 'fill-current')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{active ? 'Remove feedback' : label}</TooltipContent>
            </Tooltip>
          )
        })}
        {feedback && !commentOpen && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setDraft(feedback.comment)
              setCommentOpen(true)
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {feedback.comment ? 'Edit comment' : 'Add comment'}
          </Button>
        )}
      </div>

      {feedback && commentOpen && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <Textarea
            autoFocus
            value={draft}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              feedback.rating === 'up'
                ? 'What was helpful? (optional)'
                : 'What went wrong? (optional)'
            }
            aria-label="Feedback comment"
            className="min-h-20 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_COMMENT_LENGTH}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setCommentOpen(false)}
              >
                Skip
              </Button>
              <Button
                size="sm"
                disabled={isPending || draft.trim() === feedback.comment}
                onClick={() => void handleSendComment()}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
