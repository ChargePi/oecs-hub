import { useQuery } from '@tanstack/react-query'

import { listPromptSuggestions } from '@/lib/prompts/client'

const FALLBACK_PROMPTS = [
  'What is OCPP?',
  'Find me a charger under 1000€',
  'Which one is better: the two most popular chargers?',
]

/**
 * Fetches backend-generated (LLM-written, catalog-grounded) suggested prompts for the chat
 * empty state, across all three topics - general EV knowledge, chargers, and comparison - via
 * promptsuggestions.v1.PromptSuggestionService. Falls back to a small static list while loading
 * or on error, so the empty state is never without chips.
 */
export function useSuggestedPrompts(): string[] {
  const { data } = useQuery({
    queryKey: ['prompt-suggestions'],
    queryFn: () => listPromptSuggestions(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (!data) return FALLBACK_PROMPTS

  const prompts = [...data.general, ...data.chargers, ...data.comparison]

  return prompts.length > 0 ? prompts : FALLBACK_PROMPTS
}
