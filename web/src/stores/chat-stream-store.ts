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

/** A brand-new conversation has no id until the server assigns one, but a send needs a
 *  key to live under from the moment it's fired (so it isn't lost if the user
 *  navigates away before the id comes back) - this is that placeholder. */
function makeDraftKey(): string {
  return `draft:${crypto.randomUUID()}`
}

export function isDraftKey(key: string): boolean {
  return key.startsWith('draft:')
}

interface ChatStreamStoreState {
  entries: Record<string, ChatStreamEntry>
  /** Seeds a key's entry from a REST fetch (ChatDashboardPage's getConversation query).
   *  No-ops if that key already has a live send in flight - a stale snapshot must never
   *  clobber one, e.g. after navigating away and back while it's still running. */
  hydrate: (key: string, detail: ConversationDetail) => void
  /** Starts a send under `key` (a real conversation id, or a fresh draft key for a
   *  brand-new conversation - see makeDraftKey). Keeps running to completion in the
   *  store regardless of whether the caller stays mounted/subscribed to this key - the
   *  whole point is that switching conversations doesn't abort it. Once the server
   *  assigns a real id (only known at completion - see client.ts's streamChat), the
   *  entry is mirrored under that id too, so a later lookup by either key finds it. */
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

// Cancel closures live outside the reactive store: they're an imperative handle, not
// render-relevant data, and keying them by conversation (not a single ref like the old
// per-page hook) is what lets an in-flight send for one conversation keep running
// untouched while the user looks at another.
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
    // Guards against two overlapping polls writing into the same entry - e.g. a resend
    // fired before a prior, still-running send for this same key finished.
    cancelers[key]?.()

    const prior = get().entries[key] ?? EMPTY_ENTRY
    set((s) => ({
      entries: { ...s.entries, [key]: { ...prior, phase: 'streaming', error: null } },
    }))
    useChatActivityStore.getState().startStreaming(key)

    // Mirrors an update under both `key` and the real conversation id once it's known,
    // so a lookup under either still finds it - the caller (ChatDashboardPage) swaps
    // its own ref to the real id once it sees one, but nothing here depends on exactly
    // when that happens.
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
