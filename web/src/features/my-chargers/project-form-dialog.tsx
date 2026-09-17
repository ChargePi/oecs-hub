import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useToastAction } from '@/lib/use-toast-action'

export interface ProjectFormValues {
  name: string
  description?: string
}

/** The actual form fields, mounted only while the sheet is open - so its local state
 *  starts fresh from `initial` every time it opens, without an effect to reset it (editing
 *  project A, canceling, then opening project B would otherwise leak A's draft). */
function ProjectFormFields({
  initial,
  onSubmit,
  onDone,
}: {
  initial?: ProjectFormValues
  onSubmit: (values: ProjectFormValues) => Promise<unknown>
  onDone: () => void
}) {
  const { run, isPending } = useToastAction()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  async function handleSubmit() {
    if (!name.trim()) return

    const result = await run(() => onSubmit({ name: name.trim(), description }))
    if (result !== undefined) onDone()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="project-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Depot rollout 2026"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project for?"
        />
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}

/** Create/rename form for a project, shared by both flows - open is controlled so the
 *  parent decides when to mount it (new vs. editing an existing project). */
export function ProjectFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initial?: ProjectFormValues
  onSubmit: (values: ProjectFormValues) => Promise<unknown>
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {open && (
          <ProjectFormFields
            initial={initial}
            onSubmit={onSubmit}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
