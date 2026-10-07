import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/lib/auth/use-identity'
import { getConversation } from '@/lib/chat/client'
import type { SelectedChoice } from '@/lib/chat/types'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'
import { useChatStreamStore } from '@/stores/chat-stream-store'
import { ChatComposer } from './chat-composer'
import { ChatEmptyState } from './chat-empty-state'
import { ChatMessageList } from './chat-message-list'

/** The drawer's chat body: the active conversation (or a fresh draft) from
 *  chat-drawer-store, rendered from chat-stream-store so an in-flight reply keeps
 *  streaming while the drawer is closed or the user browses elsewhere. */
export function ChatConversationView() {
  const { identity } = useIdentity()
  const userId = identity?.id ?? ''
  const queryClient = useQueryClient()
  const conversationId = useChatDrawerStore((s) => s.activeConversationId)
  const draftKey = useChatDrawerStore((s) => s.draftKey)
  const pendingPrompt = useChatDrawerStore((s) => s.pendingPrompt)
  // "Resend" on a failed message loads its text into the composer instead of firing
  // the request again itself - token is bumped on every click (even resending the
  // same text twice in a row) so ChatComposer's prefill effect re-applies it.
  const [resendDraft, setResendDraft] = useState<{ text: string; token: number }>()
  // Tracks the pending prompt already sent, so StrictMode's double-invoke can't
  // double-send while a second "Evaluate using AI" click (new token) still can.
  const sentPromptTokenRef = useRef<number | undefined>(undefined)

  const key = conversationId ?? draftKey
  const entry = useChatStreamStore((s) => (key ? s.entries[key] : undefined))

  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    // A just-promoted draft already has its full state in the stream store.
    enabled: !!conversationId && !entry,
  })

  function handleSend(text: string, selectedChoices?: SelectedChoice[], chargerIds?: string[]) {
    const sendKey = useChatDrawerStore.getState().ensureKey()
    useChatStreamStore
      .getState()
      .send(sendKey, userId, queryClient, text, selectedChoices, chargerIds)
  }

  useEffect(() => {
    if (!pendingPrompt || !draftKey || sentPromptTokenRef.current === pendingPrompt.token) return
    sentPromptTokenRef.current = pendingPrompt.token
    useChatDrawerStore.getState().clearPendingPrompt()
    useChatStreamStore
      .getState()
      .send(draftKey, userId, queryClient, pendingPrompt.text, undefined, pendingPrompt.chargerIds)
  }, [pendingPrompt, draftKey, userId, queryClient])

  useEffect(() => {
    // Only seeds an empty entry: anything already in memory is at least as new as the
    // (possibly cached) detail, and re-hydrating would roll back a turn streamed since.
    if (!conversationId || entry || !detail || detail.conversationId !== conversationId) return
    useChatStreamStore.getState().hydrate(conversationId, detail)
  }, [conversationId, detail, entry])

  // Promotes the draft to its real conversation id once a send resolves.
  useEffect(() => {
    if (draftKey && entry?.conversationId) {
      useChatDrawerStore.getState().promote(entry.conversationId)
    }
  }, [draftKey, entry?.conversationId])

  if (conversationId && !entry && isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (conversationId && !entry && isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn't load this conversation</AlertTitle>
          <AlertDescription>
            It may have been removed, or you don't have access to it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isStreaming = entry?.phase === 'streaming'
  // Streaming counts too: the optimistic user message is already in entry.messages, but
  // an in-flight first send has no conversationId yet. A failed first send drops back to
  // the empty state (the toast reports it), since its optimistic message is stripped.
  const hasActiveConversation =
    !!entry && (entry.conversationId != null || entry.messages.length > 0 || isStreaming)

  if (!hasActiveConversation) {
    return <ChatEmptyState onSend={handleSend} disabled={isStreaming} />
  }

  return (
    <>
      <ChatMessageList
        messages={entry.messages}
        isStreaming={isStreaming}
        streamingText={entry.streamingText}
        onSubmitClarification={handleSend}
        onResend={(text) => setResendDraft({ text, token: Date.now() })}
      />
      <div className="border-t border-border p-3">
        <ChatComposer onSend={handleSend} disabled={isStreaming} prefill={resendDraft} />
      </div>
    </>
  )
}
