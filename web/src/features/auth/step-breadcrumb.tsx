import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

interface StepBreadcrumbProps {
  currentStep: number
  labels: readonly string[]
  // Every step becomes clickable (done, active, and upcoming alike) when provided -
  // jumps straight there with any already-entered data intact (register-page.tsx keeps
  // the flow mounted, CSS-hidden, rather than unmounting it on the way). Omitted
  // entirely (register-complete-page.tsx) - the account already exists by then, so
  // there's nothing sane to jump to.
  onStepClick?: (step: number) => void
}

// Numbered-circle progress indicator - not the old plain "General -> Plan" text, which
// read as clickable in-page navigation but wasn't, and only ever had 2 entries. Every
// step gets the same clickable treatment when onStepClick is provided - done, active,
// and upcoming aren't styled as different levels of interactivity, only as different
// progress states (checkmark vs. number, filled vs. outlined).
export function StepBreadcrumb({ currentStep, labels, onStepClick }: StepBreadcrumbProps) {
  return (
    <ol className="flex items-center justify-center" aria-label="Sign up progress">
      {labels.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep

        const content = (
          <>
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'border-border/60 text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : step}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-xs',
                active ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </>
        )

        return (
          <li key={label} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn('mx-1.5 h-px w-6 sm:w-10', done ? 'bg-primary' : 'bg-border')}
              />
            )}
            {onStepClick ? (
              <button
                type="button"
                onClick={() => onStepClick(step)}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md transition-opacity hover:opacity-75"
              >
                {content}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
