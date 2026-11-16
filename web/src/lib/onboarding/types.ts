import type { ChatLayout, ViewMode } from '@/lib/preferences/types'

export type OnboardingStatus = 'pending' | 'skipped' | 'completed'
export type QuestionKind = 'single' | 'multiple'

export interface OptionEffects {
  viewMode?: ViewMode
  chatLayout?: ChatLayout
  landingPath?: string
}

export interface QuestionOption {
  id: string
  label: string
  description?: string
  effects: OptionEffects
}

export interface QuestionCondition {
  questionId: string
  optionIds: string[]
}

export interface Question {
  id: string
  label: string
  title: string
  hint?: string
  kind: QuestionKind
  options: QuestionOption[]
  showIf?: QuestionCondition
}

/** Selected option ids by question id. */
export type OnboardingAnswers = Record<string, string[]>

export interface OnboardingProfile {
  status: OnboardingStatus
  answers: OnboardingAnswers
}

export interface Onboarding {
  profile: OnboardingProfile
  /** Empty for account types without a questionnaire. */
  questions: Question[]
}
