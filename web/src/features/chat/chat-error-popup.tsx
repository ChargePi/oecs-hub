import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

const AUTO_DISMISS_SECONDS = 10

/** Auto-dismissing error notice anchored above the composer - rises in place of
 *  bumping the message list, so a failed send reads as "the text bar rejected this"
 *  rather than a page-level alert. Render with `key={message}` so a new error
 *  restarts the countdown instead of reusing the old timer. */
export function ChatErrorPopup({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) onDismiss()
  }, [secondsLeft, onDismiss])

  return (
    <div
      role="alert"
      className="animate-in slide-in-from-bottom-2 fade-in relative mb-2 flex items-start gap-2 overflow-hidden rounded-lg border border-destructive/30 bg-card px-3 py-2 shadow-md duration-200"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-destructive">Message couldn't be sent</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 bg-destructive/60 transition-[width] duration-1000 ease-linear"
        style={{ width: `${(Math.max(secondsLeft, 0) / AUTO_DISMISS_SECONDS) * 100}%` }}
      />
    </div>
  )
}
