import { useEffect, useState } from 'react'
import { AlertCircle, ShieldAlert, TriangleAlert, X } from 'lucide-react'

import type { ToastSeverity } from '@/lib/errors'

const AUTO_DISMISS_SECONDS = 10

// 'warn' reuses the amber treatment chat-message-bubble.tsx already uses for a
// failed message; 'restricted' keeps the destructive tone but swaps the icon so a
// masked NOT_FOUND (see errors.ts) reads as access-denied, not "nothing here".
const SEVERITY_STYLES: Record<
  ToastSeverity,
  { Icon: typeof AlertCircle; iconClass: string; titleClass: string; borderClass: string; barClass: string }
> = {
  error: {
    Icon: AlertCircle,
    iconClass: 'text-destructive',
    titleClass: 'text-destructive',
    borderClass: 'border-destructive/30',
    barClass: 'bg-destructive/60',
  },
  warn: {
    Icon: TriangleAlert,
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-600 dark:text-amber-500',
    borderClass: 'border-amber-500/50',
    barClass: 'bg-amber-500/60',
  },
  restricted: {
    Icon: ShieldAlert,
    iconClass: 'text-destructive',
    titleClass: 'text-destructive',
    borderClass: 'border-destructive/30',
    barClass: 'bg-destructive/60',
  },
}

/** Auto-dismissing toast card - render with `key={id}` so each toast owns its own
 *  countdown instead of sharing one across the stack. */
export function ToastCard({
  title = 'Something went wrong',
  message,
  severity = 'error',
  onDismiss,
}: {
  title?: string
  message: string
  severity?: ToastSeverity
  onDismiss: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS)
  const { Icon, iconClass, titleClass, borderClass, barClass } = SEVERITY_STYLES[severity]

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
      className={`animate-in slide-in-from-bottom-2 fade-in relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 overflow-hidden rounded-lg border ${borderClass} bg-card px-3 py-2 shadow-md duration-200`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${titleClass}`}>{title}</p>
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
        className={`absolute inset-x-0 bottom-0 h-0.5 transition-[width] duration-1000 ease-linear ${barClass}`}
        style={{ width: `${(Math.max(secondsLeft, 0) / AUTO_DISMISS_SECONDS) * 100}%` }}
      />
    </div>
  )
}
