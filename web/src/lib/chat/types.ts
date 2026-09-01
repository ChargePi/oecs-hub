// Mirrors oecs-recommendation-agent's ConversationService types (see conversation.proto
// and lib/chat/client.ts).

export type MessageRole =
  | 'MESSAGE_ROLE_UNSPECIFIED'
  | 'MESSAGE_ROLE_USER'
  | 'MESSAGE_ROLE_ASSISTANT'
  | 'MESSAGE_ROLE_SYSTEM'
  | 'MESSAGE_ROLE_TOOL'

/** Progress of a conversation's most recently requested recommendation. */
export type TurnStatus =
  | 'TURN_STATUS_UNSPECIFIED'
  | 'TURN_STATUS_NONE'
  | 'TURN_STATUS_PENDING'
  | 'TURN_STATUS_RUNNING'
  | 'TURN_STATUS_COMPLETED'
  | 'TURN_STATUS_FAILED'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  metadata?: Record<string, unknown>
  createdAt: string
}

/** One selectable answer to a ClarifyingQuestion. Value/weight are fixed by the agent
 *  when the question was generated - picking a choice and sending it back as a
 *  SelectedChoice uses that weight directly, without the agent re-deriving it through
 *  another LLM call. */
export interface ClarifyingChoice {
  label: string
  value: string
  weight: number
}

/** One follow-up question the agent asks when a request is too broad to narrow down
 *  among 10,000+ chargers - always multiple-choice, never open-ended. */
export interface ClarifyingQuestion {
  question: string
  attribute: string
  importance: number
  choices: ClarifyingChoice[]
}

/** A ClarifyingChoice the user picked, sent back on the next message's metadata (key
 *  "selected_choices") so the agent can use it directly as a search attribute. */
export interface SelectedChoice {
  attribute: string
  value: string
  weight: number
}

/** One charger in a ComparisonTable's chargers list - the columns, in the same order
 *  as each ComparisonRow's values. */
export interface ComparedCharger {
  id: string
  manufacturerName: string
  modelName: string
}

/** One attribute's value across every compared charger, in the same order as
 *  ComparisonTable.chargers. */
export interface ComparisonRow {
  attribute: string
  values: string[]
}

/** The side-by-side attribute comparison for a compare_chargers answer, built
 *  deterministically by the agent (never by the LLM). */
export interface ComparisonTable {
  chargers: ComparedCharger[]
  rows: ComparisonRow[]
}

export interface ChargePointCandidate {
  id: string
  manufacturerName: string
  modelName: string
  chargerType: string
  connectorTypes: string[]
  maxPowerKw: number
  score: number
  reasoning: string
}

export interface EvidenceItem {
  sourceType: string
  sourceUri: string
  section: string
  excerpt: string
  score: number
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail {
  conversationId: string
  title: string
  messages: ChatMessage[]
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
}

export interface StreamDonePayload {
  conversationId: string
  messages: ChatMessage[]
  turnStatus: TurnStatus
  answerText: string
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
}
