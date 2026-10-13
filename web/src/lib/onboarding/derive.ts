import { CHAT_ENABLED } from '@/lib/chat/config'
import type { Preferences } from '@/lib/preferences/types'

import { visibleQuestions } from './questions'
import type { OnboardingAnswers, OnboardingProfile, OptionEffects, Question } from './types'

// Simplified wins over advanced; chat layout and landing path come from the first
// selected option that names one.
export function deriveEffects(questions: Question[], answers: OnboardingAnswers): OptionEffects {
  const effects: OptionEffects = {}

  for (const question of visibleQuestions(questions, answers)) {
    for (const option of question.options) {
      if (!(answers[question.id] ?? []).includes(option.id)) continue

      if (option.effects.viewMode === 'simplified' || !effects.viewMode) {
        effects.viewMode = option.effects.viewMode ?? effects.viewMode
      }
      effects.chatLayout ??= option.effects.chatLayout
      effects.landingPath ??= option.effects.landingPath
    }
  }

  return effects
}

// Only effects that changed since the stored profile are applied, so revisiting the
// questionnaire doesn't undo a view mode or chat layout picked by hand.
export function derivePreferences(
  questions: Question[],
  answers: OnboardingAnswers,
  previous: OnboardingProfile,
): Partial<Preferences> {
  const next = deriveEffects(questions, answers)
  const before = previous.status === 'completed' ? deriveEffects(questions, previous.answers) : {}
  const patch: Partial<Preferences> = {}

  if (next.viewMode && next.viewMode !== before.viewMode) patch.viewMode = next.viewMode
  if (next.chatLayout && next.chatLayout !== before.chatLayout) patch.chatLayout = next.chatLayout

  return patch
}

export function landingPath(questions: Question[], answers: OnboardingAnswers): string {
  const path = deriveEffects(questions, answers).landingPath
  if (!path || (path.startsWith('/chat') && !CHAT_ENABLED)) return '/'

  return path
}
