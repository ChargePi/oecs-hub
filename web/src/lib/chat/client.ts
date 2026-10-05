import { Struct } from 'google-protobuf/google/protobuf/struct_pb'

import { redirectToLoginIfSessionDead } from '@/lib/auth/use-identity'
import {
  errorSeverity,
  isAuthError,
  normalizeAndDispatch,
  toErrorMessage,
  type ToastSeverity,
} from '@/lib/errors'
import { ConversationServiceClient } from '@/lib/registry/gen/conversation/v1/ConversationServiceClientPb'
import {
  DeleteConversationsRequest,
  DeleteMessageFeedbackRequest,
  FeedbackRating as ProtoFeedbackRating,
  GetConversationRequest,
  GetConversationStatusRequest,
  ListConversationsRequest,
  Message as ProtoMessage,
  MessageFeedback as ProtoMessageFeedback,
  MessageRole as ProtoMessageRole,
  SubmitMessageFeedbackRequest,
  TurnStatus as ProtoTurnStatus,
  UpdateConversationRequest,
  UpsertConversationRequest,
} from '@/lib/registry/gen/conversation/v1/conversation_pb'

import { CHAT_STREAM_ENABLED, CONVERSATION_API_BASE } from './config'
import { parseSseStream } from './sse'
import type {
  ChargePointCandidate,
  ChatMessage,
  ClarifyingQuestion,
  ComparisonTable,
  ConversationDetail,
  ConversationSummary,
  EvidenceItem,
  FeedbackRating,
  MessageFeedback,
  MessageRole,
  ProposedAction,
  SelectedChoice,
  StreamDonePayload,
  TurnStatus,
} from './types'

// ConversationServiceClientPb's generated types don't include user_id/gateway-secret
// handling - identity comes from Traefik/Oathkeeper's forwardAuth headers, injected
// onto the request before it reaches ConversationService, the same way RegistryService's
// own /api calls never carry a user_id from this app either. Request-level user_id
// fields below are left unset; the server only falls back to trusting them for its own
// internal (non-edge) caller.
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

function feedbackFromProto(f?: ProtoMessageFeedback): MessageFeedback | undefined {
  switch (f?.getRating()) {
    case ProtoFeedbackRating.FEEDBACK_RATING_UP:
      return { rating: 'up', comment: f.getComment() }
    case ProtoFeedbackRating.FEEDBACK_RATING_DOWN:
      return { rating: 'down', comment: f.getComment() }
    default:
      return undefined
  }
}

function messageFromProto(m: ProtoMessage): ChatMessage {
  const metadataStruct = m.getMetadata()
  return {
    id: m.getId(),
    conversationId: m.getConversationId(),
    role: MESSAGE_ROLE_FROM_PROTO[m.getRole()] ?? 'MESSAGE_ROLE_UNSPECIFIED',
    content: m.getContent(),
    metadata: metadataStruct
      ? (metadataStruct.toJavaScript() as Record<string, unknown>)
      : undefined,
    createdAt: m.getCreatedAt()?.toDate().toISOString() ?? '',
    feedback: feedbackFromProto(m.getFeedback()),
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

/** Extracts the structured question/choices data the agent's clarify step attaches to
 *  a message's metadata - present only when metadata.needs_clarification is true. */
export function clarifyingQuestionsFromMetadata(
  metadata?: Record<string, unknown>,
): ClarifyingQuestion[] {
  return asRecordArray(metadata?.clarifying_questions).map((q) => ({
    question: String(q.question ?? ''),
    attribute: String(q.attribute ?? ''),
    importance: Number(q.importance ?? 0),
    choices: asRecordArray(q.choices).map((c) => ({
      label: String(c.label ?? ''),
      value: String(c.value ?? ''),
      weight: Number(c.weight ?? 0),
    })),
  }))
}

/** Extracts the choices the user picked in reply to a ClarifyingQuestion prompt from
 *  that reply message's own metadata (key "selected_choices") - used to render an
 *  earlier, already-answered clarification prompt read-only with those choices
 *  checked. */
export function selectedChoicesFromMetadata(metadata?: Record<string, unknown>): SelectedChoice[] {
  return asRecordArray(metadata?.selected_choices).map((c) => ({
    attribute: String(c.attribute ?? ''),
    value: String(c.value ?? ''),
    weight: Number(c.weight ?? 0),
  }))
}

/** Extracts the changes the assistant proposed in a reply (metadata key
 *  "pending_actions") - each one waits for the user to confirm or reject it. */
export function proposedActionsFromMetadata(metadata?: Record<string, unknown>): ProposedAction[] {
  return asRecordArray(metadata?.pending_actions)
    .map((a) => ({
      actionId: String(a.action_id ?? ''),
      kind: String(a.kind ?? ''),
      summary: String(a.summary ?? ''),
      expiresAt: String(a.expires_at ?? ''),
      destructive: a.destructive === true,
    }))
    .filter((a) => a.actionId !== '')
}

/** Extracts the deterministic side-by-side attribute table the agent's compare step
 *  attaches to a message's metadata - present only on a compare answer. Returns
 *  undefined if absent, rather than an empty table, so callers can tell "not a compare
 *  answer" apart from "compared nothing". */
export function comparisonTableFromMetadata(
  metadata?: Record<string, unknown>,
): ComparisonTable | undefined {
  const raw = metadata?.comparison_table
  if (!raw || typeof raw !== 'object') return undefined
  const table = raw as Record<string, unknown>

  return {
    chargers: asRecordArray(table.chargers).map((c) => ({
      id: String(c.id ?? ''),
      manufacturerName: String(c.manufacturer_name ?? ''),
      modelName: String(c.model_name ?? ''),
    })),
    rows: asRecordArray(table.rows).map((r) => ({
      attribute: String(r.attribute ?? ''),
      values: Array.isArray(r.values) ? r.values.map(String) : [],
    })),
  }
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
  normalizeAndDispatch(err, context, 'chat request failed')
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

export async function submitMessageFeedback(
  conversationId: string,
  messageId: string,
  rating: FeedbackRating,
  comment: string,
): Promise<MessageFeedback> {
  const req = new SubmitMessageFeedbackRequest()
  req.setConversationId(conversationId)
  req.setMessageId(messageId)
  req.setRating(
    rating === 'up'
      ? ProtoFeedbackRating.FEEDBACK_RATING_UP
      : ProtoFeedbackRating.FEEDBACK_RATING_DOWN,
  )
  req.setComment(comment)

  try {
    const resp = await client.submitMessageFeedback(req, {})
    return feedbackFromProto(resp.getFeedback()) ?? { rating, comment }
  } catch (err) {
    mapError(err, 'submitMessageFeedback')
  }
}

export async function deleteMessageFeedback(
  conversationId: string,
  messageId: string,
): Promise<void> {
  const req = new DeleteMessageFeedbackRequest()
  req.setConversationId(conversationId)
  req.setMessageId(messageId)

  try {
    await client.deleteMessageFeedback(req, {})
  } catch (err) {
    mapError(err, 'deleteMessageFeedback')
  }
}

/** Builds the outgoing message's metadata Struct from whichever optional fields are
 *  actually present - returns undefined rather than an empty Struct if none are. */
function buildOutgoingMetadata(params: {
  selectedChoices?: SelectedChoice[]
  chargerIds?: string[]
}): Struct | undefined {
  const fields: Record<string, unknown> = {}
  if (params.selectedChoices && params.selectedChoices.length > 0) {
    fields.selected_choices = params.selectedChoices
  }
  if (params.chargerIds && params.chargerIds.length > 0) {
    fields.charger_ids = params.chargerIds
  }
  return Object.keys(fields).length > 0 ? Struct.fromJavaScript(fields) : undefined
}

export interface StreamHandlers {
  onMessages?: (messages: ChatMessage[], conversationId: string) => void
  onStatus?: (status: TurnStatus) => void
  /** One chunk of the reply text, in order. Only fires over the SSE path. */
  onDelta?: (text: string) => void
  /** Discards delta text rendered so far - a server-side retry or fallback. Only
   *  fires over the SSE path. */
  onReset?: () => void
  onDone?: (payload: StreamDonePayload) => void
  onError?: (message: string, severity: ToastSeverity) => void
}

const STATUS_POLL_INTERVAL_MS = 700
const STATUS_POLL_TIMEOUT_MS = 60_000
const STREAM_RECONNECT_ATTEMPTS = 2
const STREAM_RECONNECT_DELAY_MS = 500

const TERMINAL_STATUSES: ReadonlySet<TurnStatus> = new Set([
  'TURN_STATUS_COMPLETED',
  'TURN_STATUS_FAILED',
  'TURN_STATUS_NONE',
])

const KNOWN_TURN_STATUSES: ReadonlySet<TurnStatus> = new Set([
  'TURN_STATUS_UNSPECIFIED',
  'TURN_STATUS_NONE',
  'TURN_STATUS_PENDING',
  'TURN_STATUS_RUNNING',
  'TURN_STATUS_COMPLETED',
  'TURN_STATUS_FAILED',
])

function turnStatusFromWire(value: unknown): TurnStatus {
  return typeof value === 'string' && KNOWN_TURN_STATUSES.has(value as TurnStatus)
    ? (value as TurnStatus)
    : 'TURN_STATUS_UNSPECIFIED'
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Streams conversationId's turn over StreamHandler's SSE endpoint. Returns
 *  'done' once a "done" event lands, or 'unavailable' after
 *  STREAM_RECONNECT_ATTEMPTS failed attempts - the caller falls back to
 *  pollUntilDone in that case. */
async function streamViaSse(
  conversationId: string,
  handlers: StreamHandlers,
  onStatusSeen: (status: TurnStatus) => void,
  signal: AbortSignal,
): Promise<'done' | 'unavailable'> {
  for (let attempt = 0; attempt <= STREAM_RECONNECT_ATTEMPTS; attempt++) {
    if (attempt > 0) await wait(STREAM_RECONNECT_DELAY_MS)
    if (signal.aborted) return 'done'

    try {
      const resp = await fetch(
        `${CONVERSATION_API_BASE}/stream/conversations/${encodeURIComponent(conversationId)}`,
        { credentials: 'same-origin', signal, headers: { Accept: 'text/event-stream' } },
      )
      // 401 is handled by pollUntilDone's grpc-web fallback instead.
      if (resp.status === 404 || resp.status === 401) return 'unavailable'
      if (!resp.ok || !resp.body) throw new Error(`stream request failed: ${resp.status}`)

      for await (const event of parseSseStream(resp.body)) {
        switch (event.event) {
          case 'status': {
            const status = turnStatusFromWire(
              (JSON.parse(event.data) as { status?: unknown }).status,
            )
            onStatusSeen(status)
            handlers.onStatus?.(status)
            break
          }
          case 'delta': {
            const text = (JSON.parse(event.data) as { text?: string }).text
            if (text) handlers.onDelta?.(text)
            break
          }
          case 'reset':
            handlers.onReset?.()
            break
          case 'done':
            return 'done'
        }
      }
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError'))
        return 'done'
    }
  }
  return 'unavailable'
}

/** Polls GetConversationStatus until the turn is terminal - streamChat's
 *  fallback when streamViaSse can't connect. No onDelta/onReset here. */
async function pollUntilDone(
  conversationId: string,
  handlers: StreamHandlers,
  onStatusSeen: (status: TurnStatus) => void,
  isCancelled: () => boolean,
): Promise<void> {
  const deadline = Date.now() + STATUS_POLL_TIMEOUT_MS
  let lastStatus: TurnStatus | null = null

  for (;;) {
    if (isCancelled()) return

    const statusReq = new GetConversationStatusRequest()
    statusReq.setConversationId(conversationId)
    const statusResp = await client.getConversationStatus(statusReq, {})
    const turnStatus = TURN_STATUS_FROM_PROTO[statusResp.getStatus()] ?? 'TURN_STATUS_UNSPECIFIED'
    onStatusSeen(turnStatus)

    if (turnStatus !== lastStatus) {
      lastStatus = turnStatus
      handlers.onStatus?.(turnStatus)
    }

    if (TERMINAL_STATUSES.has(turnStatus)) return
    if (Date.now() > deadline) throw new Error('timed out waiting for a reply')
    await wait(STATUS_POLL_INTERVAL_MS)
  }
}

/** Sends a message, then streams the reply via SSE, falling back to polling.
 *  Returns a cancel function; callers must invoke it on unmount/switch. */
export function streamChat(
  params: {
    conversationId: string
    userId: string
    message: string
    /** Choices the user picked in reply to a prior ClarifyingQuestion - attached to
     *  the outgoing message's metadata so the agent uses their fixed weights directly
     *  instead of re-deriving them. */
    selectedChoices?: SelectedChoice[]
    /** Exact catalog ids the caller already knows precisely (e.g. the variants selected
     *  on /compare) - attached to the outgoing message's metadata so the agent's
     *  ResolveChargers skips its name-based resolution loop entirely. Only meaningful on
     *  the message that starts a new request. */
    chargerIds?: string[]
  },
  handlers: StreamHandlers,
): () => void {
  let cancelled = false
  const controller = new AbortController()

  void (async () => {
    try {
      const upsertReq = new UpsertConversationRequest()
      if (params.conversationId) upsertReq.setConversationId(params.conversationId)
      const message = new ProtoMessage()
      message.setRole(ProtoMessageRole.MESSAGE_ROLE_USER)
      message.setContent(params.message)
      const metadata = buildOutgoingMetadata(params)
      if (metadata) message.setMetadata(metadata)
      upsertReq.setMessage(message)

      const upsertResp = await client.upsertConversation(upsertReq, {})
      if (cancelled) return
      const conv = upsertResp.getConversation()
      if (!conv) throw new Error('upsert conversation: empty response')

      const conversationId = conv.getId()
      handlers.onMessages?.(conv.getMessagesList().map(messageFromProto), conversationId)

      let finalStatus: TurnStatus = 'TURN_STATUS_FAILED'
      const onStatusSeen = (status: TurnStatus) => {
        finalStatus = status
      }

      const streamResult = CHAT_STREAM_ENABLED
        ? await streamViaSse(conversationId, handlers, onStatusSeen, controller.signal)
        : 'unavailable'
      if (cancelled) return

      if (streamResult === 'unavailable') {
        await pollUntilDone(conversationId, handlers, onStatusSeen, () => cancelled)
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
      // Only a confirmed-dead session redirects (a hard reload); anything else that merely
      // looks auth-shaped falls through to a normal error instead of bouncing via /auth/login.
      if (isAuthError(err) && (await redirectToLoginIfSessionDead())) return
      if (cancelled) return
      handlers.onError?.(
        toErrorMessage(err, 'streamChat', 'chat request failed'),
        errorSeverity(err),
      )
    }
  })()

  return () => {
    cancelled = true
    controller.abort()
  }
}
