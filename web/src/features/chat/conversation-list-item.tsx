import { type KeyboardEvent, type MouseEvent, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { deleteConversation, renameConversation } from '@/lib/chat/client'
import type { ConversationSummary } from '@/lib/chat/types'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

export function ConversationListItem({
  conversation,
  isStreaming,
  selectMode = false,
  selected = false,
  onToggleSelected,
}: {
  conversation: ConversationSummary
  isStreaming: boolean
  selectMode?: boolean
  selected?: boolean
  onToggleSelected?: () => void
}) {
  const queryClient = useQueryClient()
  const isActive = useChatDrawerStore((s) => s.activeConversationId === conversation.id)

  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(conversation.title)
  const [isBusy, setIsBusy] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  function invalidateList() {
    return queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
  }

  async function saveRename() {
    const title = draftTitle.trim()
    if (!title || title === conversation.title) {
      setIsEditing(false)
      setDraftTitle(conversation.title)
      return
    }

    setIsBusy(true)
    try {
      await renameConversation(conversation.id, title)
      await invalidateList()
      setIsEditing(false)
    } catch {
      // Left in edit mode with the attempted title so the user can retry or cancel.
    } finally {
      setIsBusy(false)
    }
  }

  function handleTitleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void saveRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraftTitle(conversation.title)
      setIsEditing(false)
    }
  }

  function activate() {
    if (isEditing) return
    if (selectMode) onToggleSelected?.()
    else useChatDrawerStore.getState().openConversation(conversation.id)
  }

  async function confirmDelete() {
    setIsBusy(true)
    try {
      await deleteConversation(conversation.id)
      await invalidateList()
      setShowDeleteDialog(false)
      if (isActive) useChatDrawerStore.getState().newConversation()
    } catch {
      // Left the dialog open so the user can see it failed and retry or cancel.
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="group relative">
      <div
        role="button"
        tabIndex={0}
        aria-current={isActive && !selectMode ? 'true' : undefined}
        aria-selected={selectMode ? selected : undefined}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            activate()
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:bg-muted',
          isActive && !selectMode && 'border-primary/40 bg-muted',
        )}
      >
        <div className={cn('flex items-center justify-between gap-2', !selectMode && 'pr-11')}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {selectMode && (
              // Decorative only - the row itself is the click target (a focusable
              // checkbox nested in a role="button" row would be two tab stops for one
              // action); this just mirrors `selected` visually.
              <Checkbox
                checked={selected}
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none"
              />
            )}
            {isEditing ? (
              <input
                autoFocus
                value={draftTitle}
                disabled={isBusy}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={() => void saveRename()}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5 text-sm font-medium outline-none focus-visible:border-ring"
              />
            ) : (
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {conversation.title || 'Untitled conversation'}
              </p>
            )}
          </div>
          {isStreaming && (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <Loader2 className="size-3 animate-spin" />
              Replying
            </Badge>
          )}
        </div>
        {formatRelativeTime(conversation.createdAt) && (
          <p className="truncate text-xs text-muted-foreground">
            Started {formatRelativeTime(conversation.createdAt)}
          </p>
        )}
      </div>

      {!isEditing && !selectMode && (
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setIsEditing(true)
            }}
            aria-label="Rename conversation"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.preventDefault()
              setShowDeleteDialog(true)
            }}
            aria-label="Delete conversation"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              "{conversation.title || 'Untitled conversation'}" and its messages will be permanently
              deleted. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBusy}
              onClick={(e) => {
                // Radix closes the dialog automatically on click unless prevented -
                // confirmDelete controls showDeleteDialog itself, closing only once
                // the delete actually succeeds (see its catch: stays open on failure
                // so the user can see it and retry).
                e.preventDefault()
                void confirmDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
