// Mirrors oecs-recommendation-agent's conversation.v1.ConversationService, called
// directly (gRPC-Web, see lib/chat/client.ts) - it's the sole entrypoint for chat,
// forwarding to agent.v1.RecommendationService (internal-only) itself.

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
