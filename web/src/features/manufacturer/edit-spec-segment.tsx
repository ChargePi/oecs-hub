import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { editSpecification } from '@/lib/manufacturer/client'
import type { ManufacturerCharger } from '@/lib/manufacturer/types'
import { SpecEditor } from './spec-editor'

export function EditSpecSegment({
  charger,
  onDone,
}: {
  charger: ManufacturerCharger
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const initialValue = useMemo(() => new TextDecoder().decode(charger.spec), [charger.spec])

  async function handleSubmit(raw: string) {
    await editSpecification(charger.id, new TextEncoder().encode(raw))
    await queryClient.invalidateQueries({ queryKey: ['manufacturer', 'chargers'] })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Edit {charger.modelName}</h2>
          <p className="text-sm text-muted-foreground">
            Only pending submissions can be edited. Saving keeps its status as "submitted".
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onDone}>
          Back to submissions
        </Button>
      </div>

      <SpecEditor
        initialValue={initialValue}
        showExamples={false}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        successMessage="Your changes were saved."
      />
    </div>
  )
}
