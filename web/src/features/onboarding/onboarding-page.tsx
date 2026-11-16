import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StepBreadcrumb } from '@/features/auth/step-breadcrumb'
import { useIdentity } from '@/lib/auth/use-identity'
import { derivePreferences, landingPath } from '@/lib/onboarding/derive'
import { applicableAnswers, isAnswered, visibleQuestions } from '@/lib/onboarding/questions'
import type { Onboarding, OnboardingAnswers } from '@/lib/onboarding/types'
import { useOnboarding, useOnboardingActions } from '@/lib/onboarding/use-onboarding'
import { usePreferences, useUpdatePreferences } from '@/lib/preferences/use-preferences'
import { cn } from '@/lib/utils'

import { ChoiceStep } from './choice-step'
import { LocaleStep, type LocalePreferences } from './locale-step'

const EXIT_MS = 180

// Same-origin paths only: return_to comes straight from the URL.
function safeReturnTo(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

export function OnboardingPage() {
  const { identity } = useIdentity()
  const { data, isError } = useOnboarding()

  if (!identity || isError || data?.questions.length === 0) return <Navigate to="/" replace />

  if (!data) {
    return (
      <div className="m-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        Loading...
      </div>
    )
  }

  return <OnboardingForm onboarding={data} showUnits={identity.userType !== 'manufacturer'} />
}

interface OnboardingFormProps {
  onboarding: Onboarding
  showUnits: boolean
}

function OnboardingForm({ onboarding: { profile, questions }, showUnits }: OnboardingFormProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('return_to'))

  const preferences = usePreferences()
  const { update, isPending: isSavingPreferences } = useUpdatePreferences()
  const { complete, skip, isPending: isSavingProfile } = useOnboardingActions()
  const isPending = isSavingPreferences || isSavingProfile

  // -1 is the intro slide, then one step per applicable question, then preferences.
  const [stepIndex, setStepIndex] = useState(-1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  // The step on screen plays its exit animation before the next one mounts.
  const [leaving, setLeaving] = useState(false)
  const exitTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])
  const [answers, setAnswers] = useState<OnboardingAnswers>(() =>
    applicableAnswers(questions, profile.answers),
  )
  const [locale, setLocale] = useState<LocalePreferences>({
    language: preferences.language,
    currency: preferences.currency,
    unitSystem: preferences.unitSystem,
  })

  const asked = visibleQuestions(questions, answers)
  const isIntro = stepIndex < 0
  const question = isIntro ? undefined : asked.at(stepIndex)
  const isLast = stepIndex === asked.length
  const editing = profile.status === 'completed'

  function goTo(target: number) {
    if (leaving || target === stepIndex) return

    setDirection(target < stepIndex ? 'back' : 'forward')
    setLeaving(true)
    exitTimer.current = window.setTimeout(() => {
      setStepIndex(target)
      setLeaving(false)
    }, EXIT_MS)
  }

  async function handleSkip() {
    if (!editing && !(await skip())) return
    navigate(returnTo ?? '/', { replace: true })
  }

  async function handleNext() {
    if (!isLast) {
      goTo(stepIndex + 1)
      return
    }

    const final = applicableAnswers(questions, answers)
    const saved = await update({ ...derivePreferences(questions, final, profile), ...locale })
    if (!saved || !(await complete(final))) return

    navigate(returnTo ?? landingPath(questions, final), { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-16 sm:py-24">
      <StepBreadcrumb
        currentStep={stepIndex + 1}
        labels={[...asked.map((q) => q.label), 'Preferences']}
        onStepClick={(target) => {
          if (asked.slice(0, target - 1).every((q) => isAnswered(q, answers))) goTo(target - 1)
        }}
      />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div
          key={isIntro ? 'intro' : (question?.id ?? 'preferences')}
          className={cn(
            'ease-out motion-reduce:[--tw-enter-translate-x:0] motion-reduce:[--tw-exit-translate-x:0]',
            leaving
              ? 'animate-out fill-mode-forwards duration-[180ms] fade-out'
              : 'animate-in duration-500 fade-in',
            leaving && (direction === 'forward' ? 'slide-out-to-left-10' : 'slide-out-to-right-10'),
            !leaving &&
              (direction === 'forward' ? 'slide-in-from-right-10' : 'slide-in-from-left-10'),
          )}
        >
          {isIntro ? (
            <div className="flex flex-col items-center text-center">
              <div className="flex flex-col gap-3">
                <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance">
                  {editing ? 'Your answers' : 'Let’s tailor things to you'}
                </h1>
                <p className="text-muted-foreground text-balance">
                  {editing
                    ? 'Change anything that no longer fits and we’ll adjust things to match.'
                    : 'A few quick questions so we can set things up for you.'}
                </p>
              </div>
            </div>
          ) : question ? (
            <ChoiceStep
              question={question}
              value={answers[question.id] ?? []}
              onChange={(selected) => setAnswers((prev) => ({ ...prev, [question.id]: selected }))}
            />
          ) : (
            <LocaleStep
              value={locale}
              showUnits={showUnits}
              onChange={(patch) => setLocale((prev) => ({ ...prev, ...patch }))}
            />
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="lg"
          disabled={isPending || leaving}
          onClick={() => void handleSkip()}
          className="text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground dark:hover:bg-transparent"
        >
          {editing ? 'Cancel' : 'Skip for now'}
        </Button>
        <div className="flex gap-2">
          {!isIntro && (
            <Button
              variant="outline"
              size="lg"
              disabled={isPending || leaving}
              onClick={() => goTo(stepIndex - 1)}
            >
              Back
            </Button>
          )}
          <Button
            size="lg"
            disabled={isPending || leaving || (question != null && !isAnswered(question, answers))}
            onClick={() => void handleNext()}
          >
            {isIntro ? (editing ? 'Review answers' : 'Get started') : isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
