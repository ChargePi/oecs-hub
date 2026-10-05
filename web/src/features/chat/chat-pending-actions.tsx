import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, FolderKanban, Heart, Star, TriangleAlert, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProposedAction } from '@/lib/chat/types'
import { useToastAction } from '@/lib/use-toast-action'
import {
  confirmPendingAction,
  listPendingActions,
  rejectPendingAction,
} from '@/lib/user-chargers/client'
import type { PendingAction, PendingActionStatus } from '@/lib/user-chargers/types'

const KIND_ICONS = {
  favorite: Heart,
  project: FolderKanban,
  rating: Star,
} as const

function pendingActionsQueryKey(conversationId: string) {
  return ['chat', 'pending-actions', conversationId]
}

/** The live status of every assistant-proposed action in a conversation, keyed by id.
 *  Shared by every card in the conversation; a card mounting for a new reply refetches
 *  it (the query is stale immediately), which is how a just-proposed action shows up. */
function usePendingActionStatuses(conversationId: string) {
  return useQuery({
    queryKey: pendingActionsQueryKey(conversationId),
    queryFn: async () => {
      const actions = await listPendingActions(conversationId)
      return new Map(actions.map((a): [string, PendingAction] => [a.id, a]))
    },
    enabled: conversationId !== '',
  })
}

/** Becomes true once expiresAt passes, so a card left open flips to "expired" without a
 *  refetch. */
function useIsExpired(expiresAt: string) {
  const expiresAtMs = Date.parse(expiresAt)
  const [expired, setExpired] = useState(
    () => !Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now(),
  )

  useEffect(() => {
    if (Number.isNaN(expiresAtMs) || expired) return
    const timer = setTimeout(() => setExpired(true), Math.max(0, expiresAtMs - Date.now()))
    return () => clearTimeout(timer)
  }, [expiresAtMs, expired])

  return expired
}

/**
 * Renders the changes the assistant proposed in a reply - favorites, projects, ratings -
 * as cards the user confirms or rejects. Nothing changes until they do: Confirm goes
 * straight to the hub with the user's own session, never through the assistant.
 */
export function ChatPendingActions({
  conversationId,
  actions,
}: {
  conversationId: string
  actions: ProposedAction[]
}) {
  const { data: statuses, isSuccess } = usePendingActionStatuses(conversationId)

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => (
        <PendingActionCard
          key={action.actionId}
          conversationId={conversationId}
          action={action}
          // Missing from a successful listing means the hub no longer has it - expired.
          serverStatus={
            isSuccess ? (statuses.get(action.actionId)?.status ?? 'expired') : undefined
          }
          // The hub's flag wins once loaded; the reply's copy covers the first render.
          destructive={statuses?.get(action.actionId)?.destructive ?? action.destructive}
        />
      ))}
    </div>
  )
}

function PendingActionCard({
  conversationId,
  action,
  serverStatus,
  destructive,
}: {
  conversationId: string
  action: ProposedAction
  /** Undefined while the conversation's statuses are still loading. */
  serverStatus?: PendingActionStatus
  destructive: boolean
}) {
  const queryClient = useQueryClient()
  const { run, isPending } = useToastAction()
  const expired = useIsExpired(action.expiresAt)

  const status: PendingActionStatus | undefined =
    serverStatus === 'pending' && expired ? 'expired' : serverStatus
  const Icon = KIND_ICONS[action.kind as keyof typeof KIND_ICONS] ?? Check

  async function decide(decision: 'confirm' | 'reject') {
    const result = await run(() =>
      decision === 'confirm'
        ? confirmPendingAction(action.actionId)
        : rejectPendingAction(action.actionId),
    )

    // Refetched either way: a failed decision usually means the action was already
    // decided elsewhere or has expired, and the card should say so.
    await queryClient.invalidateQueries({ queryKey: pendingActionsQueryKey(conversationId) })

    if (result?.status === 'confirmed') {
      await queryClient.invalidateQueries({ queryKey: ['user-chargers'] })
      if (action.kind === 'rating') await queryClient.invalidateQueries({ queryKey: ['variant'] })
    }
  }

  if (status !== undefined && status !== 'pending') {
    return <ResolvedAction summary={action.summary} status={status} />
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border bg-background px-3 py-2',
        destructive ? 'border-destructive/40' : 'border-border',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', destructive ? 'text-destructive' : 'text-primary')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm">{action.summary}</p>
        {destructive && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <TriangleAlert className="size-3.5 shrink-0" />
            This removes something and can't be undone from here.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending || status === undefined}
            onClick={() => decide('confirm')}
          >
            <Check />
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || status === undefined}
            onClick={() => decide('reject')}
          >
            Reject
          </Button>
        </div>
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Dismiss"
        className="-mr-1 text-muted-foreground"
        disabled={isPending || status === undefined}
        onClick={() => decide('reject')}
      >
        <X />
      </Button>
    </div>
  )
}

const RESOLVED_LABELS: Record<Exclude<PendingActionStatus, 'pending'>, string> = {
  confirmed: 'Done',
  rejected: 'Rejected',
  failed: "Couldn't apply",
  expired: 'Expired',
}

function ResolvedAction({
  summary,
  status,
}: {
  summary: string
  status: Exclude<PendingActionStatus, 'pending'>
}) {
  const Icon =
    status === 'confirmed'
      ? Check
      : status === 'failed'
        ? TriangleAlert
        : status === 'expired'
          ? Clock
          : X

  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-xs',
        status === 'confirmed' && 'text-primary',
        status === 'failed' && 'text-amber-600 dark:text-amber-500',
        (status === 'rejected' || status === 'expired') && 'text-muted-foreground',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="font-medium">{RESOLVED_LABELS[status]}:</span>
      <span className={cn('min-w-0 truncate', status === 'rejected' && 'line-through')}>
        {summary}
      </span>
    </p>
  )
}
