import { lazy, Suspense, useState } from 'react'

import { SegmentedPage } from '@/components/layout/segmented-page'
import { Skeleton } from '@/components/ui/skeleton'
import type { ManufacturerCharger } from '@/lib/manufacturer/types'
import { SubmissionsTable } from './submissions-table'

// Both segments pull in the Monaco editor (~1.3MB) via SpecEditor - lazy-load them so
// landing on "Submissions" (the default tab) doesn't pay for that unless the manufacturer
// actually opens "Submit new spec" or edits a row.
const SubmitNewSegment = lazy(() =>
  import('./submit-new-segment').then((m) => ({ default: m.SubmitNewSegment })),
)
const EditSpecSegment = lazy(() =>
  import('./edit-spec-segment').then((m) => ({ default: m.EditSpecSegment })),
)

function EditorSkeleton() {
  return <Skeleton className="h-[480px] w-full" />
}

type Segment = 'submissions' | 'submit'

const NAV_ITEMS: { value: Segment; label: string }[] = [
  { value: 'submissions', label: 'Submissions' },
  { value: 'submit', label: 'Submit new spec' },
]

/** The manufacturer segment set for the shared "My chargers" shell - see MyChargersPage,
 *  which picks this or the individual segment set by account type. */
export function ManufacturerChargersPage() {
  const [segment, setSegment] = useState<Segment>('submissions')
  const [editingCharger, setEditingCharger] = useState<ManufacturerCharger | null>(null)

  function selectSegment(value: Segment) {
    setSegment(value)
    setEditingCharger(null)
  }

  return (
    <SegmentedPage
      title="My chargers"
      description="Manage the charger specifications you've submitted."
      items={NAV_ITEMS}
      value={segment}
      onChange={selectSegment}
    >
      {editingCharger ? (
        <Suspense fallback={<EditorSkeleton />}>
          <EditSpecSegment charger={editingCharger} onDone={() => setEditingCharger(null)} />
        </Suspense>
      ) : segment === 'submissions' ? (
        <SubmissionsTable onEdit={setEditingCharger} />
      ) : (
        <Suspense fallback={<EditorSkeleton />}>
          <SubmitNewSegment />
        </Suspense>
      )}
    </SegmentedPage>
  )
}
