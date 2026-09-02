import { type KeyboardEvent, type MouseEvent, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  async function confirmDelete() {
    // Read the real URL rather than useParams(): a conversation just started from the
    // empty-state composer gets its /chat/<id> URL via history.replaceState (see
    // chat-dashboard-page.tsx), not a router navigation, specifically so starting a
    // conversation doesn't remount the page and interrupt its live stream - but that
    // also means react-router's own param state never picks it up.
    const isActive = window.location.pathname === `/chat/${conversation.id}`

    setIsBusy(true)
    try {
      await deleteConversation(conversation.id)
      await invalidateList()
      setShowDeleteDialog(false)
      if (isActive) navigate('/chat')
    } catch {
      // Left the dialog open so the user can see it failed and retry or cancel.
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="group relative">
      <NavLink
        to={`/chat/${conversation.id}`}
        aria-selected={selectMode ? selected : undefined}
        onClick={(e) => {
          if (isEditing) {
            e.preventDefault()
            return
          }
          if (selectMode) {
            e.preventDefault()
            onToggleSelected?.()
          }
        }}
        className={({ isActive }) =>
          cn(
            'flex flex-col gap-1 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted',
            isActive && !selectMode && 'border-primary/40 bg-muted',
          )
        }
      >
        <div className={cn('flex items-center justify-between gap-2', !selectMode && 'pr-11')}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {selectMode && (
              // Decorative only - a real (focusable) checkbox nested inside the NavLink's
              // <a> would be invalid HTML, and stopping its click from bubbling up would
              // skip the NavLink's own onClick below (the preventDefault that stops this
              // from navigating), causing a full page reload instead of a selection toggle.
              // The row itself is the click target; this just mirrors `selected` visually.
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
                onClick={(e) => e.preventDefault()}
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
      </NavLink>

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
