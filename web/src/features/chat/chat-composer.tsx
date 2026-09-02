import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { SendHorizonal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ChatComposer({
  onSend,
  disabled,
  placeholder = 'Ask me anything about the chargers…',
  autoFocus,
  prefill,
}: {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
  /** Loads text into the box without sending it - e.g. "Resend" on a failed message
   *  populates it so the user can review/edit before sending it themselves, rather
   *  than firing the request again automatically. `token` must change on every
   *  request (even to reload the exact same text) so a second click re-applies it
   *  after the box was cleared or edited. */
  prefill?: { text: string; token: number }
}) {
  const [value, setValue] = useState('')
  const [appliedToken, setAppliedToken] = useState<number>()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Adjusting state during render rather than in an effect (React's "you might not
  // need an effect" pattern) - runs synchronously as part of this render when a new
  // prefill arrives, so there's no extra flash of the old value. Guarded by
  // appliedToken (not e.g. whether prefill is set) so it fires exactly once per
  // request, even one that reloads the exact same text, and never re-stomps the box
  // on an unrelated re-render while the user is editing.
  if (prefill && prefill.token !== appliedToken) {
    setAppliedToken(prefill.token)
    setValue(prefill.text)
  }

  // Focusing is a real side effect (touches the DOM/browser focus, not React state),
  // so it belongs in an effect - kept separate from the state adjustment above so
  // that one can stay a plain render-time update instead of a setState-in-effect.
  useEffect(() => {
    if (appliedToken !== undefined) textareaRef.current?.focus()
  }, [appliedToken])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={1}
        className={cn(
          'placeholder:text-muted-foreground max-h-40 min-h-9 w-full flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
      <Button size="icon" onClick={submit} disabled={disabled || !value.trim()} aria-label="Send">
        <SendHorizonal />
      </Button>
    </div>
  )
}
