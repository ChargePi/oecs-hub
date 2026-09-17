import { type ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface SegmentedPageItem<T extends string> {
  value: T
  label: string
}

/**
 * The "My chargers" page shell: a title/subtitle header, a left sidebar of segment buttons
 * on desktop, and the same list in a slide-over Sheet on mobile. Extracted from the
 * manufacturer-only page so individual accounts' segment set (favorites/projects/rated
 * chargers) can reuse it alongside the manufacturer one (submissions/submit new spec).
 */
export function SegmentedPage<T extends string>({
  title,
  description,
  items,
  value,
  onChange,
  children,
}: {
  title: string
  description: string
  items: SegmentedPageItem<T>[]
  value: T
  onChange: (value: T) => void
  children: ReactNode
}) {
  const [navOpen, setNavOpen] = useState(false)

  function selectSegment(next: T) {
    onChange(next)
    setNavOpen(false)
  }

  function renderNav() {
    return (
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectSegment(item.value)}
            className={cn(
              'rounded-md px-3 py-2 text-left text-sm transition-colors',
              value === item.value
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
          <h1 className="font-heading text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
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
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div className="p-4">{renderNav()}</div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
