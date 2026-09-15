import { lazy, Suspense, useState } from 'react'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { ManufacturerCharger } from '@/lib/manufacturer/types'
import { cn } from '@/lib/utils'
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

export function ManufacturerChargersPage() {
  const [segment, setSegment] = useState<Segment>('submissions')
  const [editingCharger, setEditingCharger] = useState<ManufacturerCharger | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  function selectSegment(value: Segment) {
    setSegment(value)
    setEditingCharger(null)
    setNavOpen(false)
  }

  function renderNav() {
    return (
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectSegment(item.value)}
            className={cn(
              'rounded-md px-3 py-2 text-left text-sm transition-colors',
              segment === item.value && !editingCharger
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">My chargers</h1>
          <p className="text-sm text-muted-foreground">
            Manage the charger specifications you've submitted.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={() => setNavOpen(true)}
        >
          <Menu />
          <span className="sr-only">Open navigation</span>
        </Button>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="hidden shrink-0 md:block md:w-48">{renderNav()}</div>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>My chargers</SheetTitle>
            </SheetHeader>
            <div className="p-4">{renderNav()}</div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
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
        </div>
      </div>
    </div>
  )
}
