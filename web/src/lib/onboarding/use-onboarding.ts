import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useIdentity } from '@/lib/auth/use-identity'
import { useToastAction } from '@/lib/use-toast-action'

import { completeOnboarding, getOnboarding, skipOnboarding } from './client'
import type { Onboarding, OnboardingAnswers, OnboardingProfile } from './types'

const QUERY_KEY = ['onboarding']

export function useOnboarding() {
  const { identity } = useIdentity()

  return useQuery({
    queryKey: [...QUERY_KEY, identity?.id],
    queryFn: getOnboarding,
    enabled: identity != null,
    staleTime: 5 * 60_000,
  })
}

export function useOnboardingActions() {
  const { identity } = useIdentity()
  const queryClient = useQueryClient()
  const { run, isPending } = useToastAction()

  async function save(fn: () => Promise<OnboardingProfile>): Promise<boolean> {
    const profile = await run(fn)
    if (profile === undefined) return false

    queryClient.setQueryData<Onboarding>(
      [...QUERY_KEY, identity?.id],
      (prev) => prev && { ...prev, profile },
    )
    return true
  }

  return {
    complete: (answers: OnboardingAnswers) => save(() => completeOnboarding(answers)),
    skip: () => save(skipOnboarding),
    isPending,
  }
}
