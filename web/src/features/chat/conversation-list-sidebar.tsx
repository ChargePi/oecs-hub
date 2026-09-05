import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { ListChecks, MessageSquarePlus, PanelLeftClose, Trash2, X } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/lib/auth/use-identity'
import { deleteConversations, listConversations } from '@/lib/chat/client'
import { useChatActivityStore } from '@/stores/chat-activity-store'
import { ConversationListItem } from './conversation-list-item'

export function ConversationListSidebar({ onCollapse }: { onCollapse: () => void }) {
  const { identity } = useIdentity()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const streamingConversationIds = useChatActivityStore((s) => s.streamingConversationIds)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const {
    data: conversations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['chat', 'conversations', identity?.id],
    queryFn: () => listConversations(identity!.id),
    enabled: !!identity,
  })

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (!conversations || conversations.length === 0) return
    setSelectedIds((prev) =>
      prev.size === conversations.length ? new Set() : new Set(conversations.map((c) => c.id)),
    )
  }

  async function confirmBulkDelete() {
    const ids = [...selectedIds]
    // Same rationale as ConversationListItem.confirmDelete: the live URL, not
    // router param state, since a just-started conversation's URL is set via
    // history.replaceState rather than navigation.
    const activePath = window.location.pathname
    const deletingActive = ids.some((id) => activePath === `/chat/${id}`)

    setIsBulkDeleting(true)
    try {
      await deleteConversations(ids)
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
      setShowBulkDeleteDialog(false)
      exitSelectMode()
      if (deletingActive) navigate('/chat')
    } catch {
      // Left the dialog open so the user can see it failed and retry or cancel.
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const hasConversations = !!conversations && conversations.length > 0
  const allSelected = hasConversations && selectedIds.size === conversations.length

  return (
    <aside className="sticky top-14 flex h-[calc(100svh-3.5rem)] w-72 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <Button asChild className="w-full" size="sm">
            <Link to="/chat">
              <MessageSquarePlus />
              New conversation
            </Link>
          </Button>
        </div>
        {hasConversations && !selectMode && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setSelectMode(true)}
            aria-label="Select conversations"
          >
            <ListChecks />
          </Button>
        )}
        {!selectMode && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onCollapse}
            aria-label="Hide conversation history"
          >
            <PanelLeftClose />
          </Button>
        )}
      </div>

      {selectMode && (
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0}
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 />
              Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={exitSelectMode}
              aria-label="Cancel selection"
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            Couldn't load your conversations.
          </p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No conversations yet. Start one to get a recommendation.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isStreaming={streamingConversationIds.has(conversation.id)}
                selectMode={selectMode}
                selected={selectedIds.has(conversation.id)}
                onToggleSelected={() => toggleSelected(conversation.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} conversation{selectedIds.size === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              These conversations and their messages will be permanently deleted. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBulkDeleting}
              onClick={(e) => {
                e.preventDefault()
                void confirmBulkDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
