import { X } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { useOnboarding, useOnboardingActions } from '@/lib/onboarding/use-onboarding'

const HIDDEN_ON = ['/onboarding', '/auth']

export function OnboardingBanner() {
  const { pathname } = useLocation()
  const { data } = useOnboarding()
  const { skip, isPending } = useOnboardingActions()

  if (!data || data.profile.status !== 'pending' || data.questions.length === 0) return null
  if (HIDDEN_ON.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null
  }

  return (
    <div className="flex items-center justify-center gap-3 border-b border-border/60 bg-primary/10 px-4 py-2 text-sm">
      <span className="text-foreground">
        Answer a few quick questions to tailor the platform to you.
      </span>
      <Button asChild size="sm">
        <Link to="/onboarding">Get started</Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        disabled={isPending}
        onClick={() => void skip()}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
