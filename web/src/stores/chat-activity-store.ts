import { create } from 'zustand'

// Not persisted (unlike comparison-store): this only tracks which conversations have a
// live send in flight in *this* tab right now, so the conversation list sidebar can
// show a "replying" badge next to each. It has no meaning across reloads/tabs. A Set
// (not a single id) because a send now keeps running in the background when the user
// switches away from it - see chat-stream-store.ts - so more than one can be active
// at once.
interface ChatActivityState {
  streamingConversationIds: Set<string>
  startStreaming: (conversationId: string) => void
  stopStreaming: (conversationId: string) => void
}

export const useChatActivityStore = create<ChatActivityState>((set) => ({
  streamingConversationIds: new Set(),
  startStreaming: (conversationId) =>
    set((s) => ({
      streamingConversationIds: new Set(s.streamingConversationIds).add(conversationId),
    })),
  stopStreaming: (conversationId) =>
    set((s) => {
      if (!s.streamingConversationIds.has(conversationId)) return s
      const next = new Set(s.streamingConversationIds)
      next.delete(conversationId)
      return { streamingConversationIds: next }
    }),
}))
