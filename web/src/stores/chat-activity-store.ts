import { create } from 'zustand'

// Not persisted (unlike comparison-store): this only tracks which conversation has a
// live SSE stream open in *this* tab right now, so the conversation list sidebar can
// show a "replying" badge next to it. It has no meaning across reloads/tabs.
interface ChatActivityState {
  streamingConversationId: string | null
  setStreaming: (conversationId: string | null) => void
}

export const useChatActivityStore = create<ChatActivityState>((set) => ({
  streamingConversationId: null,
  setStreaming: (conversationId) => set({ streamingConversationId: conversationId }),
}))
