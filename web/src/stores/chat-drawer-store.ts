import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { makeDraftKey } from './chat-draft-key'

export type ChatDrawerView = 'chat' | 'history' | 'results'

export interface PendingPrompt {
  text: string
  chargerIds?: string[]
  /** Bumped per ask() so the same prompt asked twice still sends twice. */
  token: number
}

// The assistant drawer mounted in AppShell. Which conversation it shows lives here
// rather than in the URL, so browsing other pages never interrupts it. Only `open` and
// `activeConversationId` are persisted - a draft or pending prompt is per-tab state.
interface ChatDrawerState {
  open: boolean
  view: ChatDrawerView
  activeConversationId?: string
  /** chat-stream-store key for a conversation with no server id yet. */
  draftKey?: string
  pendingPrompt?: PendingPrompt
  setOpen: (open: boolean) => void
  toggle: () => void
  setView: (view: ChatDrawerView) => void
  openConversation: (id: string) => void
  newConversation: () => void
  /** Opens the drawer on a fresh conversation and queues `text` to be sent. */
  ask: (text: string, chargerIds?: string[]) => void
  /** Returns the key to send under, minting a draft key when there's none yet. */
  ensureKey: () => string
  /** Moves a draft over to its real conversation id once the first send resolves. */
  promote: (id: string) => void
  clearPendingPrompt: () => void
}

export const useChatDrawerStore = create<ChatDrawerState>()(
  persist(
    (set, get) => ({
      open: false,
      view: 'chat',
      setOpen: (open) => set({ open }),
      toggle: () => set({ open: !get().open }),
      setView: (view) => set({ view }),
      openConversation: (id) =>
        set({ activeConversationId: id, draftKey: undefined, view: 'chat', open: true }),
      newConversation: () =>
        set({ activeConversationId: undefined, draftKey: undefined, view: 'chat' }),
      ask: (text, chargerIds) =>
        set({
          open: true,
          view: 'chat',
          activeConversationId: undefined,
          draftKey: makeDraftKey(),
          pendingPrompt: { text, chargerIds, token: Date.now() },
        }),
      ensureKey: () => {
        const { activeConversationId, draftKey } = get()
        const key = activeConversationId ?? draftKey
        if (key) return key
        const fresh = makeDraftKey()
        set({ draftKey: fresh })
        return fresh
      },
      promote: (id) => set({ activeConversationId: id, draftKey: undefined }),
      clearPendingPrompt: () => set({ pendingPrompt: undefined }),
    }),
    {
      name: 'oecs-chat-drawer',
      partialize: (s) => ({ open: s.open, activeConversationId: s.activeConversationId }),
    },
  ),
)
