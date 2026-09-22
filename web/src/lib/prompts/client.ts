import { normalizeAndDispatch } from '@/lib/errors'

import { PromptSuggestionsServiceClient } from '../registry/gen/prompts/v1/PromptsServiceClientPb'
import { ListPromptSuggestionsRequest, PromptTopic } from '../registry/gen/prompts/v1/prompts_pb'

// Same backend/port as lib/registry's RegistryServiceClient (PromptSuggestionsService is
// registered on oecs-hub's own gRPC server) - unlike lib/chat, which talks to a different
// service entirely, this one shares '/api'.
const BASE_URL = '/api'

const client = new PromptSuggestionsServiceClient(BASE_URL, null, null)

export type PromptTopicName = 'general' | 'chargers' | 'comparison'

const TOPIC_TO_PROTO: Record<PromptTopicName, PromptTopic> = {
  general: PromptTopic.PROMPT_TOPIC_GENERAL,
  chargers: PromptTopic.PROMPT_TOPIC_CHARGERS,
  comparison: PromptTopic.PROMPT_TOPIC_COMPARISON,
}

const TOPIC_FROM_PROTO: Partial<Record<PromptTopic, PromptTopicName>> = {
  [PromptTopic.PROMPT_TOPIC_GENERAL]: 'general',
  [PromptTopic.PROMPT_TOPIC_CHARGERS]: 'chargers',
  [PromptTopic.PROMPT_TOPIC_COMPARISON]: 'comparison',
}

function mapError(err: unknown, context: string): never {
  normalizeAndDispatch(err, context, 'prompt suggestions request failed')
}

/**
 * Fetches suggested chat prompts, grouped by topic. With no `topics` given, the backend
 * returns all three (general/chargers/comparison) in one round trip; passing a subset only
 * fetches those.
 */
export async function listPromptSuggestions(
  topics?: PromptTopicName[],
): Promise<Record<PromptTopicName, string[]>> {
  const req = new ListPromptSuggestionsRequest()
  if (topics && topics.length > 0) {
    req.setTopicsList(topics.map((t) => TOPIC_TO_PROTO[t]))
  }

  try {
    const resp = await client.listPromptSuggestions(req, {})
    const result: Record<PromptTopicName, string[]> = { general: [], chargers: [], comparison: [] }

    for (const s of resp.getSuggestionsList()) {
      const topic = TOPIC_FROM_PROTO[s.getTopic()]
      if (topic) result[topic].push(s.getText())
    }

    return result
  } catch (err) {
    mapError(err, 'listPromptSuggestions')
  }
}
