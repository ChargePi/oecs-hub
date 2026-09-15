import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'
import { StepBreadcrumb } from './step-breadcrumb'

interface RegistrationLayoutProps extends PropsWithChildren {
  currentStep: number
  labels: readonly string[]
  onStepClick?: (step: number) => void
  // Plan cards need side-by-side room for their expanded (price/commitment/features)
  // content - every other step still wants the narrower, single-column max-w-md.
  wide?: boolean
}

// Breadcrumb pinned to the top of the viewport (not the top of the card - it sits above
// it, never overlapping the fields) while the step's own content still centers in
// whatever vertical space is left below it. `flex-1` here is what lets `m-auto` on the
// content block center it within this wrapper instead of the whole page collapsing to
// content height - `main` (AppShell) is itself `flex flex-1 flex-col`, so this needs to
// claim that same stretch behavior as its direct child before "leftover space" exists.
export function RegistrationLayout({
  currentStep,
  labels,
  onStepClick,
  wide,
  children,
}: RegistrationLayoutProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="pt-8">
        <StepBreadcrumb currentStep={currentStep} labels={labels} onStepClick={onStepClick} />
      </div>
      <div
        className={cn(
          'm-auto flex w-full flex-col gap-4 px-4 py-8',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        {children}
      </div>
    </div>
  )
}
