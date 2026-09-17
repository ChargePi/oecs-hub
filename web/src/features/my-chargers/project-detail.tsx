import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Search, X } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { registryClient } from '@/lib/registry/client'
import { useToastAction } from '@/lib/use-toast-action'
import {
  deleteProject,
  getProject,
  manageProjectChargers,
  updateProject,
} from '@/lib/user-chargers/client'
import { VariantDetailSheet } from '@/features/product/variant-detail-sheet'
import { ProjectFormDialog } from './project-form-dialog'

function AddChargerSheet({
  open,
  onOpenChange,
  excludeIds,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  excludeIds: string[]
  onPick: (variantId: string) => void
}) {
  const [query, setQuery] = useState('')

  const { data: variants = [] } = useQuery({
    queryKey: ['all-variants'],
    queryFn: () => registryClient.listVariants(),
    enabled: open,
  })

  const normalized = query.trim().toLowerCase()
  const available = variants
    .filter((v) => !excludeIds.includes(v.id))
    .filter(
      (v) =>
        !normalized ||
        v.model.name.toLowerCase().includes(normalized) ||
        v.manufacturer.name.toLowerCase().includes(normalized),
    )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add charger to project</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by model or manufacturer"
              className="pl-9"
            />
          </div>

          <ul className="flex flex-col gap-1 overflow-y-auto">
            {available.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                No matching chargers.
              </p>
            ) : (
              available.map((variant) => (
                <li key={variant.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(variant.id)
                      setQuery('')
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span>
                      <span className="font-medium">{variant.model.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {variant.manufacturer.name}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const { run } = useToastAction()
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [openVariantId, setOpenVariantId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  const queryKey = ['user-chargers', 'project', projectId]
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: () => getProject(projectId) })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function handleRemove(chargerVariantId: string) {
    const result = await run(() =>
      manageProjectChargers(projectId, [{ chargerVariantId, action: 'remove' }]),
    )
    if (result !== undefined) await refresh()
  }

  async function handleAdd(chargerVariantId: string) {
    const result = await run(() =>
      manageProjectChargers(projectId, [{ chargerVariantId, action: 'add' }]),
    )
    if (result !== undefined) {
      await refresh()
      setAddOpen(false)
    }
  }

  function startEditingNote(chargerVariantId: string, currentNote: string | undefined) {
    setEditingNoteId(chargerVariantId)
    setNoteDraft(currentNote ?? '')
  }

  async function saveNote(chargerVariantId: string) {
    const result = await run(() =>
      manageProjectChargers(projectId, [{ chargerVariantId, action: 'set_note', note: noteDraft }]),
    )
    setEditingNoteId(null)
    if (result !== undefined) await refresh()
  }

  async function handleDelete() {
    const result = await run(() => deleteProject(projectId))
    if (result !== undefined) {
      await queryClient.invalidateQueries({ queryKey: ['user-chargers', 'projects'] })
      onBack()
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">This project isn't available right now.</p>
  }

  const { project, chargers } = data
  const chargerIds = chargers.map((c) => c.charger.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to projects</span>
          </Button>
          <div>
            <h2 className="font-heading text-lg font-semibold">{project.name}</h2>
            {project.description ? (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes "{project.name}" and its charger list. This can't be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep project</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {chargers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chargers in this project yet.</p>
        ) : (
          chargers.map((member) => (
            <div
              key={member.charger.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setOpenVariantId(member.charger.id)}
                >
                  <p className="font-medium hover:underline">{member.charger.model.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.charger.manufacturer.name}
                  </p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(member.charger.id)}>
                  <X className="size-4" />
                  <span className="sr-only">Remove from project</span>
                </Button>
              </div>

              {editingNoteId === member.charger.id ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note"
                  />
                  <Button size="sm" onClick={() => saveNote(member.charger.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-fit text-left text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => startEditingNote(member.charger.id, member.note)}
                >
                  {member.note ? member.note : 'Add a note…'}
                </button>
              )}
            </div>
          ))
        )}

        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add charger
        </Button>
      </div>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit project"
        initial={{ name: project.name, description: project.description }}
        onSubmit={async (values) => {
          const updated = await updateProject(projectId, values)
          await refresh()
          return updated
        }}
      />

      <AddChargerSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        excludeIds={chargerIds}
        onPick={handleAdd}
      />

      <VariantDetailSheet variantId={openVariantId} onClose={() => setOpenVariantId(null)} />
    </div>
  )
}
