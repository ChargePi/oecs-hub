import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, PanelRightOpen } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/lib/auth/use-identity'
import { getConversation } from '@/lib/chat/client'
import type { SelectedChoice } from '@/lib/chat/types'
import { useRecommendationsSidebarStore } from '@/stores/recommendations-sidebar-store'
import { makeDraftKey, useChatStreamStore } from '@/stores/chat-stream-store'
import { ChatComposer } from './chat-composer'
import { ChatEmptyState } from './chat-empty-state'
import { ChatErrorPopup } from './chat-error-popup'
import { ChatMessageList } from './chat-message-list'
import { RecommendationsPanel } from './recommendations-panel'

export function ChatDashboardPage() {
  const { conversationId: routeId } = useParams<{ conversationId?: string }>()
  const location = useLocation()
  const { identity } = useIdentity()
  const userId = identity?.id ?? ''
  const queryClient = useQueryClient()
  const recommendationsCollapsed = useRecommendationsSidebarStore((s) => s.collapsed)
  const toggleRecommendations = useRecommendationsSidebarStore((s) => s.toggle)
  // "Resend" on a failed message loads its text into the composer instead of firing
  // the request again itself - token is bumped on every click (even resending the
  // same text twice in a row) so ChatComposer's prefill effect re-applies it.
  const [resendDraft, setResendDraft] = useState<{ text: string; token: number }>()
  // Guards the auto-send effect below against firing twice (StrictMode) - state
  // wouldn't do, since setting it is itself what triggers the send.
  const autoSentPromptRef = useRef(false)
  // The chat-stream-store key for a conversation with no route id yet (state, not a
  // ref, so the subscription below re-renders when it changes).
  const [draftKey, setDraftKey] = useState<string>()
  const [lastLocationKey, setLastLocationKey] = useState(location.key)

  // Clears draftKey on a real navigation to /chat's index, e.g. "New conversation" -
  // checked via location.key, not routeId, since that link re-navigates to /chat
  // without routeId ever changing. Adjusted during render, not an effect, per
  // eslint(react-hooks/set-state-in-effect). Doesn't cancel anything (chat-stream-store
  // keeps sending regardless) - it only stops this page from watching the old key.
  if (location.key !== lastLocationKey) {
    setLastLocationKey(location.key)
    if (!routeId) setDraftKey(undefined)
  }

  const key = routeId ?? draftKey
  const entry = useChatStreamStore((s) => (key ? s.entries[key] : undefined))

  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['chat', 'conversation', routeId],
    queryFn: () => getConversation(routeId!),
    enabled: !!routeId,
  })

  function handleSend(text: string, selectedChoices?: SelectedChoice[], chargerIds?: string[]) {
    const sendKey = key ?? makeDraftKey()
    if (sendKey !== draftKey) setDraftKey(sendKey)
    useChatStreamStore.getState().send(sendKey, userId, queryClient, text, selectedChoices, chargerIds)
  }

  // A comparison-view "Evaluate using AI" click lands here as /chat?prompt=... - fires
  // that message immediately instead of just prefilling the composer. autoPromptKey is
  // established during render (same set-state-in-effect reason as above);
  // autoSentPromptRef, read only inside the effect, guards the send itself.
  const [autoPromptKey, setAutoPromptKey] = useState<string>()
  const pendingAutoPrompt = !routeId && new URLSearchParams(window.location.search).has('prompt')
  if (pendingAutoPrompt && !autoPromptKey) {
    setAutoPromptKey(makeDraftKey())
  }

  useEffect(() => {
    if (routeId || autoSentPromptRef.current || !autoPromptKey) return
    const params = new URLSearchParams(window.location.search)
    const prompt = params.get('prompt')
    if (!prompt) return
    const chargerIds = params.get('chargerIds')?.split(',').filter(Boolean)
    autoSentPromptRef.current = true
    // Cosmetic replace (not a router navigation, same as below) so refreshing doesn't resend.
    window.history.replaceState(null, '', '/chat')
    useChatStreamStore.getState().send(autoPromptKey, userId, queryClient, prompt, undefined, chargerIds)
  }, [routeId, autoPromptKey, userId, queryClient])

  useEffect(() => {
    if (routeId && detail && detail.conversationId === routeId) {
      useChatStreamStore.getState().hydrate(routeId, detail)
    }
  }, [routeId, detail])

  // Promotes draftKey to the real conversationId once a send resolves (render, not an effect).
  if (entry?.conversationId && entry.conversationId !== draftKey && entry.conversationId !== routeId) {
    setDraftKey(entry.conversationId)
  }

  useEffect(() => {
    // Cosmetic URL sync for a conversation just started from the empty state, so the
    // address bar reflects it without a router navigation remounting this page and
    // interrupting the send in flight.
    if (entry?.conversationId && entry.conversationId !== routeId) {
      window.history.replaceState(null, '', `/chat/${entry.conversationId}`)
    }
  }, [entry?.conversationId, routeId])

  if (routeId && isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (routeId && isError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
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
  // Includes an errored first message on a brand-new conversation (no conversationId,
  // no messages ever landed) - otherwise the failure has nowhere to render and silently
  // reverts to the empty-state prompt as if nothing was sent.
  const hasActiveConversation =
    !!entry && (entry.conversationId != null || entry.messages.length > 0 || entry.error != null)

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!hasActiveConversation ? (
          <ChatEmptyState onSend={handleSend} disabled={isStreaming} />
        ) : (
          <>
            <ChatMessageList
              messages={entry.messages}
              isStreaming={isStreaming}
              onSubmitClarification={handleSend}
              onResend={(text) => setResendDraft({ text, token: Date.now() })}
            />
            <div className="border-t border-border p-3">
              <div className="mx-auto w-full max-w-2xl">
                {entry.error && (
                  <ChatErrorPopup
                    key={entry.error}
                    message={entry.error}
                    onDismiss={() => useChatStreamStore.getState().clearError(key!)}
                  />
                )}
                <ChatComposer onSend={handleSend} disabled={isStreaming} prefill={resendDraft} />
              </div>
            </div>
          </>
        )}
      </div>

      {hasActiveConversation &&
        (recommendationsCollapsed ? (
          // The panel's own collapse button goes away with it, so this is the only way
          // back - sticky at the same top offset the panel's header row sits at.
          <div className="sticky top-14 flex h-[calc(100svh-3.5rem)] shrink-0 items-start p-3">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={toggleRecommendations}
              aria-label="Show recommendations"
            >
              <PanelRightOpen />
            </Button>
          </div>
        ) : (
          <RecommendationsPanel
            candidates={entry.candidates}
            evidence={entry.evidence}
            onCollapse={toggleRecommendations}
          />
        ))}
    </div>
  )
}
