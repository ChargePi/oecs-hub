import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/lib/auth/use-identity'
import { getConversation } from '@/lib/chat/client'
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
          <AlertDescription>It may have been removed, or you don't have access to it.</AlertDescription>
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
            <ChatMessageList messages={stream.messages} isStreaming={isStreaming} />
            <div className="border-t border-border p-3">
              <div className="mx-auto w-full max-w-2xl">
                {stream.error && (
                  <ChatErrorPopup
                    key={stream.error}
                    message={stream.error}
                    onDismiss={stream.clearError}
                  />
                )}
                <ChatComposer onSend={stream.send} disabled={isStreaming} />
              </div>
            </div>
          </>
        )}
      </div>

      {hasActiveConversation && (
        <RecommendationsPanel candidates={stream.candidates} evidence={stream.evidence} />
      )}
    </div>
  )
}
