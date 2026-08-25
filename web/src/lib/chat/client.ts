import { RpcError } from 'grpc-web'

import { ConversationServiceClient } from '@/lib/registry/gen/conversation/v1/ConversationServiceClientPb'
import {
  DeleteConversationsRequest,
  GetConversationRequest,
  GetConversationStatusRequest,
  ListConversationsRequest,
  Message as ProtoMessage,
  MessageRole as ProtoMessageRole,
  TurnStatus as ProtoTurnStatus,
  UpdateConversationRequest,
  UpsertConversationRequest,
} from '@/lib/registry/gen/conversation/v1/conversation_pb'

import { CONVERSATION_API_BASE } from './config'
import type {
  ChargePointCandidate,
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  EvidenceItem,
  MessageRole,
  StreamDonePayload,
  TurnStatus,
} from './types'

// ConversationServiceClientPb's generated types don't include user_id/gateway-secret
// handling - identity comes from Traefik/Oathkeeper's forwardAuth headers, injected
// onto the request before it reaches ConversationService (see that service's
// internal/pkg/auth), the same way RegistryService's own /api calls never carry a
// user_id from this app either. Request-level user_id fields below are left unset;
// the server only falls back to trusting them for its own internal (non-edge) caller.
const client = new ConversationServiceClient(CONVERSATION_API_BASE, null, null)

const MESSAGE_ROLE_FROM_PROTO: Record<ProtoMessageRole, MessageRole> = {
  [ProtoMessageRole.MESSAGE_ROLE_UNSPECIFIED]: 'MESSAGE_ROLE_UNSPECIFIED',
  [ProtoMessageRole.MESSAGE_ROLE_USER]: 'MESSAGE_ROLE_USER',
  [ProtoMessageRole.MESSAGE_ROLE_ASSISTANT]: 'MESSAGE_ROLE_ASSISTANT',
  [ProtoMessageRole.MESSAGE_ROLE_SYSTEM]: 'MESSAGE_ROLE_SYSTEM',
  [ProtoMessageRole.MESSAGE_ROLE_TOOL]: 'MESSAGE_ROLE_TOOL',
}

const TURN_STATUS_FROM_PROTO: Record<ProtoTurnStatus, TurnStatus> = {
  [ProtoTurnStatus.TURN_STATUS_UNSPECIFIED]: 'TURN_STATUS_UNSPECIFIED',
  [ProtoTurnStatus.TURN_STATUS_NONE]: 'TURN_STATUS_NONE',
  [ProtoTurnStatus.TURN_STATUS_PENDING]: 'TURN_STATUS_PENDING',
  [ProtoTurnStatus.TURN_STATUS_RUNNING]: 'TURN_STATUS_RUNNING',
  [ProtoTurnStatus.TURN_STATUS_COMPLETED]: 'TURN_STATUS_COMPLETED',
  [ProtoTurnStatus.TURN_STATUS_FAILED]: 'TURN_STATUS_FAILED',
}

function messageFromProto(m: ProtoMessage): ChatMessage {
  const metadataStruct = m.getMetadata()
  return {
    id: m.getId(),
    role: MESSAGE_ROLE_FROM_PROTO[m.getRole()] ?? 'MESSAGE_ROLE_UNSPECIFIED',
    content: m.getContent(),
    metadata: metadataStruct
      ? (metadataStruct.toJavaScript() as Record<string, unknown>)
      : undefined,
    createdAt: m.getCreatedAt()?.toDate().toISOString() ?? '',
  }
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function candidatesFromMetadata(metadata?: Record<string, unknown>): ChargePointCandidate[] {
  return asRecordArray(metadata?.candidates).map((c) => ({
    id: String(c.id ?? ''),
    manufacturerName: String(c.manufacturer_name ?? ''),
    modelName: String(c.model_name ?? ''),
    chargerType: String(c.charger_type ?? ''),
    connectorTypes: Array.isArray(c.connector_types) ? c.connector_types.map(String) : [],
    maxPowerKw: Number(c.max_power_kw ?? 0),
    score: Number(c.score ?? 0),
    reasoning: String(c.reasoning ?? ''),
  }))
}

function evidenceFromMetadata(metadata?: Record<string, unknown>): EvidenceItem[] {
  return asRecordArray(metadata?.evidence).map((e) => ({
    sourceType: String(e.source_type ?? ''),
    sourceUri: String(e.source_uri ?? ''),
    section: String(e.section ?? ''),
    excerpt: String(e.excerpt ?? ''),
    score: Number(e.score ?? 0),
  }))
}

/** Extracts candidates/evidence from the most recent assistant message that carries
 *  them in its metadata - the agent worker's persist step stores them there. */
function lastRecommendationFromMessages(messages: ChatMessage[]): {
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
} {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'MESSAGE_ROLE_ASSISTANT' || !m.metadata) continue
    return {
      candidates: candidatesFromMetadata(m.metadata),
      evidence: evidenceFromMetadata(m.metadata),
    }
  }
  return { candidates: [], evidence: [] }
}

function mapError(err: unknown, context: string): never {
  if (err instanceof RpcError) {
    console.error(`chat request failed: ${context}`, err.code, err.message)
    throw new Error(err.message)
  }
  console.error(`chat request failed: ${context}`, err)
  throw err instanceof Error ? err : new Error(String(err))
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const req = new ListConversationsRequest()
  req.setUserId(userId)
  req.setPageSize(50)

  try {
    const resp = await client.listConversations(req, {})
    return resp.getConversationsList().map((c) => ({
      id: c.getId(),
      title: c.getTitle(),
      createdAt: c.getCreatedAt()?.toDate().toISOString() ?? '',
      updatedAt: c.getUpdatedAt()?.toDate().toISOString() ?? '',
    }))
  } catch (err) {
    mapError(err, 'listConversations')
  }
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  const req = new GetConversationRequest()
  req.setConversationId(conversationId)

  try {
    const resp = await client.getConversation(req, {})
    const conv = resp.getConversation()
    if (!conv) throw new Error('conversation not found')

    const messages = conv.getMessagesList().map(messageFromProto)
    const { candidates, evidence } = lastRecommendationFromMessages(messages)
    return { conversationId: conv.getId(), title: conv.getTitle(), messages, candidates, evidence }
  } catch (err) {
    mapError(err, 'getConversation')
  }
}

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  const req = new UpdateConversationRequest()
  req.setConversationId(conversationId)
  req.setTitle(title)

  try {
    await client.updateConversation(req, {})
  } catch (err) {
    mapError(err, 'renameConversation')
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  return deleteConversations([conversationId])
}

export async function deleteConversations(conversationIds: string[]): Promise<void> {
  const req = new DeleteConversationsRequest()
  req.setConversationIdsList(conversationIds)

  try {
    await client.deleteConversations(req, {})
  } catch (err) {
    mapError(err, 'deleteConversations')
  }
}

export interface StreamHandlers {
  onMessages?: (messages: ChatMessage[]) => void
  onStatus?: (status: TurnStatus) => void
  onDone?: (payload: StreamDonePayload) => void
  onError?: (message: string) => void
}

const STATUS_POLL_INTERVAL_MS = 700
const STATUS_POLL_TIMEOUT_MS = 60_000

const TERMINAL_STATUSES: ReadonlySet<TurnStatus> = new Set([
  'TURN_STATUS_COMPLETED',
  'TURN_STATUS_FAILED',
  'TURN_STATUS_NONE',
])

/**
 * Sends a message, then polls GetConversationStatus until the agent's reply is ready.
 * ConversationService's RPCs are all unary - there's no real push channel - so this
 * mirrors the shape a server-push stream would have (onMessages/onStatus/onDone/
 * onError) purely by polling from the browser, so callers don't need to know the
 * difference. Returns a cancel function; callers must invoke it on
 * unmount/conversation switch.
 */
export function streamChat(
  params: { conversationId: string; userId: string; message: string },
  handlers: StreamHandlers,
): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms)
    })

  void (async () => {
    try {
      const upsertReq = new UpsertConversationRequest()
      if (params.conversationId) upsertReq.setConversationId(params.conversationId)
      const message = new ProtoMessage()
      message.setRole(ProtoMessageRole.MESSAGE_ROLE_USER)
      message.setContent(params.message)
      upsertReq.setMessage(message)

      const upsertResp = await client.upsertConversation(upsertReq, {})
      if (cancelled) return
      const conv = upsertResp.getConversation()
      if (!conv) throw new Error('upsert conversation: empty response')

      const conversationId = conv.getId()
      handlers.onMessages?.(conv.getMessagesList().map(messageFromProto))

      const deadline = Date.now() + STATUS_POLL_TIMEOUT_MS
      let lastStatus: TurnStatus | null = null
      let finalStatus: TurnStatus = 'TURN_STATUS_FAILED'

      for (;;) {
        if (cancelled) return

        const statusReq = new GetConversationStatusRequest()
        statusReq.setConversationId(conversationId)
        const statusResp = await client.getConversationStatus(statusReq, {})
        const turnStatus =
          TURN_STATUS_FROM_PROTO[statusResp.getStatus()] ?? 'TURN_STATUS_UNSPECIFIED'

        if (turnStatus !== lastStatus) {
          lastStatus = turnStatus
          handlers.onStatus?.(turnStatus)
        }

        if (TERMINAL_STATUSES.has(turnStatus) || Date.now() > deadline) {
          finalStatus = turnStatus
          break
        }
        await wait(STATUS_POLL_INTERVAL_MS)
      }
      if (cancelled) return

      const getReq = new GetConversationRequest()
      getReq.setConversationId(conversationId)
      const getResp = await client.getConversation(getReq, {})
      const finalConv = getResp.getConversation()
      if (!finalConv) throw new Error('get conversation: empty response')

      const messages = finalConv.getMessagesList().map(messageFromProto)
      const { candidates, evidence } = lastRecommendationFromMessages(messages)
      const lastMessage = messages[messages.length - 1]
      const answerText = lastMessage?.role === 'MESSAGE_ROLE_ASSISTANT' ? lastMessage.content : ''

      handlers.onDone?.({
        conversationId,
        messages,
        turnStatus: finalStatus,
        answerText,
        candidates,
        evidence,
      })
    } catch (err) {
      if (cancelled) return
      const message =
        err instanceof RpcError ? err.message : err instanceof Error ? err.message : String(err)
      handlers.onError?.(message)
    }
  })()

  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}
