import { create } from 'zustand'

// Which conversations have a live send in this tab, for the sidebar's "replying"
// badge. A Set, not a single id: a send keeps running in the background after the
// user switches away (see chat-stream-store.ts), so more than one can be active.
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
