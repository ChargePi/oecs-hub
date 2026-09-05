import { create } from 'zustand'
import type { QueryClient } from '@tanstack/react-query'

import { streamChat } from '@/lib/chat/client'
import type {
  ChargePointCandidate,
  ChatMessage,
  ConversationDetail,
  EvidenceItem,
  SelectedChoice,
  TurnStatus,
} from '@/lib/chat/types'
import { useChatActivityStore } from './chat-activity-store'

export type ChatStreamPhase = 'idle' | 'streaming' | 'error'

export interface ChatStreamEntry {
  conversationId: string | null
  messages: ChatMessage[]
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
  phase: ChatStreamPhase
  status: TurnStatus | null
  error: string | null
}

const EMPTY_ENTRY: ChatStreamEntry = {
  conversationId: null,
  messages: [],
  candidates: [],
  evidence: [],
  phase: 'idle',
  status: null,
  error: null,
}

/** Placeholder key for a conversation with no server-assigned id yet. */
function makeDraftKey(): string {
  return `draft:${crypto.randomUUID()}`
}

export function isDraftKey(key: string): boolean {
  return key.startsWith('draft:')
}

interface ChatStreamStoreState {
  entries: Record<string, ChatStreamEntry>
  /** Seeds a key from a REST fetch. No-ops if a send is already live under it, so a
   *  stale snapshot can't clobber one still in progress. */
  hydrate: (key: string, detail: ConversationDetail) => void
  /** Starts a send under `key`, kept running to completion regardless of whether the
   *  caller stays subscribed - that's what lets switching conversations not abort it. */
  send: (
    key: string,
    userId: string,
    queryClient: QueryClient,
    message: string,
    selectedChoices?: SelectedChoice[],
    chargerIds?: string[],
  ) => void
  clearError: (key: string) => void
}

// Cancel closures are imperative handles, not render-relevant data, so they live
// outside the reactive store - keyed per conversation so one send's cancel doesn't
// affect another's.
const cancelers: Record<string, () => void> = {}

export const useChatStreamStore = create<ChatStreamStoreState>((set, get) => ({
  entries: {},

  hydrate: (key, detail) => {
    set((s) => {
      const existing = s.entries[key]
      if (existing?.phase === 'streaming') return s
      return {
        entries: {
          ...s.entries,
          [key]: {
            conversationId: detail.conversationId,
            messages: detail.messages,
            candidates: detail.candidates,
            evidence: detail.evidence,
            phase: 'idle',
            status: null,
            error: null,
          },
        },
      }
    })
  },

  send: (key, userId, queryClient, message, selectedChoices, chargerIds) => {
    // Guards against a resend overlapping a still-running prior send for this key.
    cancelers[key]?.()

    const prior = get().entries[key] ?? EMPTY_ENTRY
    set((s) => ({
      entries: { ...s.entries, [key]: { ...prior, phase: 'streaming', error: null } },
    }))
    useChatActivityStore.getState().startStreaming(key)

    // Mirrors under the real conversation id too, once known, so lookups by either key work.
    function writeBoth(patch: Partial<ChatStreamEntry>) {
      set((s) => {
        const merged = { ...(s.entries[key] ?? EMPTY_ENTRY), ...patch }
        const entries = { ...s.entries, [key]: merged }
        if (patch.conversationId && patch.conversationId !== key) {
          entries[patch.conversationId] = merged
        }
        return { entries }
      })
    }

    cancelers[key] = streamChat(
      { conversationId: isDraftKey(key) ? '' : key, userId, message, selectedChoices, chargerIds },
      {
        onMessages: (messages) => writeBoth({ messages }),
        onStatus: (status) => writeBoth({ status }),
        onDone: (payload) => {
          writeBoth({
            conversationId: payload.conversationId,
            messages: payload.messages,
            candidates: payload.candidates,
            evidence: payload.evidence,
            phase: 'idle',
            status: payload.turnStatus,
            error: null,
          })
          useChatActivityStore.getState().stopStreaming(key)
          useChatActivityStore.getState().stopStreaming(payload.conversationId)
          void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
        },
        onError: (message) => {
          writeBoth({ phase: 'error', error: message })
          useChatActivityStore.getState().stopStreaming(key)
        },
      },
    )
  },

  clearError: (key) => {
    set((s) => {
      const existing = s.entries[key]
      if (!existing?.error) return s
      return { entries: { ...s.entries, [key]: { ...existing, error: null } } }
    })
  },
}))

export { makeDraftKey }
