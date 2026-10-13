import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

const EXIT_MS = 180

type Direction = 'forward' | 'back'

interface Shown<T extends number> {
  step: T
  direction: Direction
}

// Lags `step` by the exit animation: `shown` is what to render, and `className` goes on
// each step's container. Works for steps that stay mounted and are only CSS-hidden too,
// since an element's animation restarts whenever it stops being display: none.
export function useStepTransition<T extends number>(step: T) {
  const [shown, setShown] = useState<Shown<T>>({ step, direction: 'forward' })

  const leaving = step !== shown.step
  const direction: Direction = leaving ? (step < shown.step ? 'back' : 'forward') : shown.direction

  useEffect(() => {
    if (!leaving) return

    const timer = window.setTimeout(() => setShown({ step, direction }), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [step, leaving, direction])

  const className = cn(
    'ease-out motion-reduce:[--tw-enter-translate-x:0] motion-reduce:[--tw-exit-translate-x:0]',
    leaving
      ? 'animate-out fill-mode-forwards duration-[180ms] fade-out'
      : 'animate-in duration-500 fade-in',
    leaving && (direction === 'forward' ? 'slide-out-to-left-10' : 'slide-out-to-right-10'),
    !leaving && (direction === 'forward' ? 'slide-in-from-right-10' : 'slide-in-from-left-10'),
  )

  return { shown: shown.step, leaving, className }
}
