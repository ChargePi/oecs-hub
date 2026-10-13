import type { OnboardingAnswers, Question } from './types'

/** The questions that apply given the answers so far, in order. */
export function visibleQuestions(questions: Question[], answers: OnboardingAnswers): Question[] {
  const visible: Question[] = []

  for (const question of questions) {
    const condition = question.showIf
    const asked =
      !condition ||
      (visible.some((q) => q.id === condition.questionId) &&
        (answers[condition.questionId] ?? []).some((id) => condition.optionIds.includes(id)))

    if (asked) visible.push(question)
  }

  return visible
}

/** Drops answers to questions that no longer apply and options the server no longer offers. */
export function applicableAnswers(
  questions: Question[],
  answers: OnboardingAnswers,
): OnboardingAnswers {
  const known: OnboardingAnswers = {}
  for (const question of questions) {
    const selected = (answers[question.id] ?? []).filter((id) =>
      question.options.some((o) => o.id === id),
    )
    if (selected.length > 0) known[question.id] = selected
  }

  const applicable: OnboardingAnswers = {}
  for (const question of visibleQuestions(questions, known)) {
    if (known[question.id]) applicable[question.id] = known[question.id]
  }

  return applicable
}

export function isAnswered(question: Question, answers: OnboardingAnswers): boolean {
  return (answers[question.id] ?? []).length > 0
}
