import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { streamChat } from '@/lib/chat/client'
import type {
  ChargePointCandidate,
  ChatMessage,
  ConversationDetail,
  EvidenceItem,
  SelectedChoice,
  TurnStatus,
} from '@/lib/chat/types'
import { useChatActivityStore } from '@/stores/chat-activity-store'

export type ChatStreamPhase = 'idle' | 'streaming' | 'error'

interface ChatStreamState {
  conversationId: string | null
  messages: ChatMessage[]
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
  phase: ChatStreamPhase
  status: TurnStatus | null
  error: string | null
}

const EMPTY_STATE: ChatStreamState = {
  conversationId: null,
  messages: [],
  candidates: [],
  evidence: [],
  phase: 'idle',
  status: null,
  error: null,
}

/**
 * Drives one conversation's live message stream. Holds its own state rather than
 * react-query's cache because it's mutated event-by-event as the SSE stream comes in,
 * not replaced wholesale by a single fetch - `hydrate()` is how a react-query-backed
 * initial load (see ChatDashboardPage) feeds into it.
 */
export function useChatStream(userId: string) {
  const [state, setState] = useState<ChatStreamState>(EMPTY_STATE)
  const closeStreamRef = useRef<(() => void) | null>(null)
  const setStreamingId = useChatActivityStore((s) => s.setStreaming)
  const queryClient = useQueryClient()

  useEffect(() => () => closeStreamRef.current?.(), [])

  const hydrate = useCallback((detail: ConversationDetail) => {
    setState({
      conversationId: detail.conversationId,
      messages: detail.messages,
      candidates: detail.candidates,
      evidence: detail.evidence,
      phase: 'idle',
      status: null,
      error: null,
    })
  }, [])

  const reset = useCallback(() => {
    closeStreamRef.current?.()
    setState(EMPTY_STATE)
  }, [])

  /** Closes any in-flight stream without clearing state - for when the caller is about
   *  to overwrite state itself (e.g. switching conversations via hydrate()) and just
   *  needs the old connection stopped first so it doesn't keep delivering events for a
   *  conversation that's no longer on screen. */
  const cancel = useCallback(() => {
    closeStreamRef.current?.()
    setStreamingId(null)
  }, [setStreamingId])

  const clearError = useCallback(() => {
    setState((s) => (s.error ? { ...s, error: null } : s))
  }, [])

  const send = useCallback(
    (text: string, selectedChoices?: SelectedChoice[]) => {
      closeStreamRef.current?.()

      const conversationId = state.conversationId
      if (conversationId) setStreamingId(conversationId)
      setState((s) => ({ ...s, phase: 'streaming', error: null }))

      closeStreamRef.current = streamChat(
        { conversationId: conversationId ?? '', userId, message: text, selectedChoices },
        {
          onMessages: (messages) => setState((s) => ({ ...s, messages })),
          onStatus: (status) => setState((s) => ({ ...s, status })),
          onDone: (payload) => {
            setState({
              conversationId: payload.conversationId,
              messages: payload.messages,
              candidates: payload.candidates,
              evidence: payload.evidence,
              phase: 'idle',
              status: payload.turnStatus,
              error: null,
            })
            setStreamingId(null)
            void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
          },
          onError: (message) => {
            setState((s) => ({ ...s, phase: 'error', error: message }))
            setStreamingId(null)
          },
        },
      )
    },
    [state.conversationId, userId, setStreamingId, queryClient],
  )

  return { ...state, send, hydrate, reset, cancel, clearError }
}
