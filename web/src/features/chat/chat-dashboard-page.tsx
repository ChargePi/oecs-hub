import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, PanelRightOpen } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/lib/auth/use-identity'
import { getConversation } from '@/lib/chat/client'
import { useRecommendationsSidebarStore } from '@/stores/recommendations-sidebar-store'
import { ChatComposer } from './chat-composer'
import { ChatEmptyState } from './chat-empty-state'
import { ChatErrorPopup } from './chat-error-popup'
import { ChatMessageList } from './chat-message-list'
import { RecommendationsPanel } from './recommendations-panel'
import { useChatStream } from './use-chat-stream'

export function ChatDashboardPage() {
  const { conversationId: routeId } = useParams<{ conversationId?: string }>()
  const { identity } = useIdentity()
  const stream = useChatStream(identity?.id ?? '')
  const recommendationsCollapsed = useRecommendationsSidebarStore((s) => s.collapsed)
  const toggleRecommendations = useRecommendationsSidebarStore((s) => s.toggle)
  // "Resend" on a failed message loads its text into the composer instead of firing
  // the request again itself - token is bumped on every click (even resending the
  // same text twice in a row) so ChatComposer's prefill effect re-applies it.
  const [resendDraft, setResendDraft] = useState<{ text: string; token: number }>()
  // Guards the auto-send effect below against firing twice (e.g. StrictMode's double
  // invoke) - state wouldn't do, since setting it is itself what triggers the send.
  const autoSentPromptRef = useRef(false)

  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['chat', 'conversation', routeId],
    queryFn: () => getConversation(routeId!),
    enabled: !!routeId,
  })

  // Reacts to sidebar navigation (a real route change, since NavLink targets a
  // different :conversationId under the same route). Not remounting on param change is
  // react-router's normal behavior here, so this effect is what actually swaps the
  // visible conversation - and it must stop any stream left running for the previous
  // one first, otherwise its events would keep landing on the new view.
  useEffect(() => {
    stream.cancel()
    if (!routeId) stream.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  // A comparison-view "Evaluate using AI" click lands here as /chat?prompt=... - fire that
  // message immediately instead of just prefilling the composer. The query param is
  // stripped via a raw history replace (cosmetic only, not a router navigation - same
  // reasoning as the conversationId sync below) so refreshing never resends it.
  useEffect(() => {
    if (routeId || autoSentPromptRef.current) return
    const params = new URLSearchParams(window.location.search)
    const prompt = params.get('prompt')
    if (!prompt) return
    const chargerIds = params.get('chargerIds')?.split(',').filter(Boolean)
    autoSentPromptRef.current = true
    window.history.replaceState(null, '', '/chat')
    stream.send(prompt, undefined, chargerIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  useEffect(() => {
    if (routeId && detail && detail.conversationId === routeId) stream.hydrate(detail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, detail])

  useEffect(() => {
    // Cosmetic URL sync only (not a router navigation) for a conversation just started
    // from the empty-state composer, so the address bar reflects it without remounting
    // this page/interrupting the stream still in flight - see use-chat-stream's design
    // note on why that matters.
    if (stream.conversationId && stream.conversationId !== routeId) {
      window.history.replaceState(null, '', `/chat/${stream.conversationId}`)
    }
  }, [stream.conversationId, routeId])

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

  const isStreaming = stream.phase === 'streaming'
  // Includes an errored first message on a brand-new conversation (no conversationId,
  // no messages ever landed) - otherwise the failure has nowhere to render and silently
  // reverts to the empty-state prompt as if nothing was sent.
  const hasActiveConversation =
    stream.conversationId != null || stream.messages.length > 0 || stream.error != null

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!hasActiveConversation ? (
          <ChatEmptyState onSend={stream.send} disabled={isStreaming} />
        ) : (
          <>
            <ChatMessageList
              messages={stream.messages}
              isStreaming={isStreaming}
              onSubmitClarification={stream.send}
              onResend={(text) => setResendDraft({ text, token: Date.now() })}
            />
            <div className="border-t border-border p-3">
              <div className="mx-auto w-full max-w-2xl">
                {stream.error && (
                  <ChatErrorPopup
                    key={stream.error}
                    message={stream.error}
                    onDismiss={stream.clearError}
                  />
                )}
                <ChatComposer onSend={stream.send} disabled={isStreaming} prefill={resendDraft} />
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
            candidates={stream.candidates}
            evidence={stream.evidence}
            onCollapse={toggleRecommendations}
          />
        ))}
    </div>
  )
}
