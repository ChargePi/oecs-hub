import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  History,
  LogIn,
  MessageSquarePlus,
  PanelRightClose,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { loginRedirect, useIdentity } from '@/lib/auth/use-identity'
import { listConversations } from '@/lib/chat/client'
import { cn } from '@/lib/utils'
import { type ChatDrawerView, useChatDrawerStore } from '@/stores/chat-drawer-store'
import { useChatStreamStore } from '@/stores/chat-stream-store'
import { ChatConversationView } from './chat-conversation-view'
import { ConversationList } from './conversation-list'
import { ItemsPanel } from './items-panel'
import { DOCKED_QUERY, useDrawerWidth } from './use-drawer-width'

/** The assistant, docked beside every page (AppShell mounts it while open) instead of
 *  living on its own route - a resizable column when there's room, a full-width sheet otherwise. */
export function ChatDrawer() {
  const docked = useMediaQuery(DOCKED_QUERY)

  if (docked) return <DockedDrawer />

  return (
    <Sheet open onOpenChange={(next) => useChatDrawerStore.getState().setOpen(next)}>
      <SheetContent showCloseButton={false} aria-describedby={undefined} className="sm:max-w-full">
        <SheetTitle className="sr-only">Assistant</SheetTitle>
        <ChatPanel onHide={hideDrawer} />
      </SheetContent>
    </Sheet>
  )
}

function hideDrawer() {
  useChatDrawerStore.getState().setOpen(false)
}

function DockedDrawer() {
  const { width, dragging, handle } = useDrawerWidth()

  return (
    <aside
      className="sticky top-14 z-10 flex h-[calc(100svh-3.5rem)] shrink-0 flex-col border-l border-border bg-background"
      style={{ width }}
      aria-label="Assistant"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize assistant"
        aria-valuenow={width}
        tabIndex={0}
        title="Drag to resize, double-click to reset"
        className={cn(
          'absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none outline-none hover:bg-primary/30 focus-visible:bg-primary/40',
          dragging && 'bg-primary/40',
        )}
        {...handle}
      />
      <ChatPanel onHide={hideDrawer} />
    </aside>
  )
}

export function ChatPanel({ onHide }: { onHide?: () => void }) {
  const { identity, isLoading } = useIdentity()
  const view = useChatDrawerStore((s) => s.view)
  const key = useChatDrawerStore((s) => s.activeConversationId ?? s.draftKey)
  const entry = useChatStreamStore((s) => (key ? s.entries[key] : undefined))
  const resultCount = entry?.candidates.length ?? 0
  const hasResults = resultCount > 0 || (entry?.evidence.length ?? 0) > 0
  // Results empties out on "New conversation"; fall back rather than strand the user.
  const shown: ChatDrawerView = view === 'results' && !hasResults ? 'chat' : view

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader
        onHide={onHide}
        view={identity ? shown : 'chat'}
        signedIn={!!identity}
        resultCount={hasResults ? resultCount : undefined}
      />
      {isLoading ? null : !identity ? (
        <SignInPrompt />
      ) : shown === 'history' ? (
        <ConversationList />
      ) : shown === 'results' && entry ? (
        <ItemsPanel candidates={entry.candidates} evidence={entry.evidence} />
      ) : (
        <ChatConversationView />
      )}
    </div>
  )
}

function DrawerHeader({
  onHide,
  view,
  signedIn,
  resultCount,
}: {
  onHide?: () => void
  view: ChatDrawerView
  signedIn: boolean
  /** Undefined while the conversation has nothing to show in Results. */
  resultCount?: number
}) {
  const { identity } = useIdentity()
  const conversationId = useChatDrawerStore((s) => s.activeConversationId)
  const { setView, newConversation } = useChatDrawerStore.getState()
  const { data: conversations } = useQuery({
    queryKey: ['chat', 'conversations', identity?.id],
    queryFn: () => listConversations(identity!.id),
    enabled: !!identity,
  })
  const title = conversations?.find((c) => c.id === conversationId)?.title || 'New conversation'

  return (
    <div className="flex flex-col border-b border-border">
      <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-3">
        <Sparkles className="size-4 shrink-0 text-primary" />
        {!signedIn ? (
          <span className="flex-1 px-1.5 text-sm font-medium">Assistant</span>
        ) : view === 'history' ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setView('chat')}
              title="Back to conversation"
              aria-label="Back to conversation"
            >
              <ArrowLeft />
            </Button>
            <span className="flex-1 text-sm font-medium">Conversations</span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setView('history')}
            title="Show all conversations"
            className="min-w-0 flex-1 truncate rounded-md px-1.5 py-1 text-left text-sm font-medium hover:bg-muted"
          >
            {title}
          </button>
        )}
        {signedIn && (
          <>
            <Button
              variant={view === 'history' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setView(view === 'history' ? 'chat' : 'history')}
              title="Conversation history"
              aria-label="Conversation history"
              aria-pressed={view === 'history'}
            >
              <History />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={newConversation}
              title="New conversation"
              aria-label="New conversation"
            >
              <MessageSquarePlus />
            </Button>
          </>
        )}
        {onHide && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onHide}
            title="Hide assistant"
            aria-label="Hide assistant"
          >
            <PanelRightClose />
          </Button>
        )}
      </div>

      {signedIn && view !== 'history' && (
        <div role="tablist" aria-label="Assistant view" className="flex gap-1 px-3 pb-2">
          <TabButton active={view === 'chat'} onClick={() => setView('chat')}>
            Chat
          </TabButton>
          <TabButton
            active={view === 'results'}
            disabled={resultCount === undefined}
            onClick={() => setView('results')}
          >
            Results
            {!!resultCount && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[11px] text-primary">
                {resultCount}
              </span>
            )}
          </TabButton>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function SignInPrompt() {
  const location = useLocation()
  const pendingPrompt = useChatDrawerStore((s) => s.pendingPrompt)
  const clearPendingPrompt = useChatDrawerStore((s) => s.clearPendingPrompt)
  const from = location.pathname + location.search
  // A queued prompt is in-memory only, so it rides through login on the /chat?prompt=
  // handoff (see ChatRedirect) and lands back on this page.
  const handoff = pendingPrompt
    ? new URLSearchParams({
        prompt: pendingPrompt.text,
        chargerIds: pendingPrompt.chargerIds?.join(',') ?? '',
        from,
      })
    : undefined

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <Sparkles className="size-8 text-primary" aria-hidden="true" />
      <div>
        <h2 className="font-heading text-lg font-semibold">Ask the assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to get charger recommendations and comparisons for your use case.
        </p>
      </div>
      <Button asChild>
        <Link
          to={
            handoff
              ? loginRedirect('/chat', `?${handoff}`)
              : loginRedirect(location.pathname, location.search)
          }
          onClick={clearPendingPrompt}
        >
          <LogIn />
          Sign in
        </Link>
      </Button>
    </div>
  )
}
