import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useComparisonStore } from '@/stores/comparison-store'
import { diffToneClasses, type DiffTone } from './comparison-diff'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      {children}
    </div>
  )
}

function LegendSwatch({ tone, children }: { tone: DiffTone; children: string }) {
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-xs font-medium text-foreground',
        diffToneClasses[tone],
      )}
    >
      {children}
    </span>
  )
}

/** Difference options for the compare page, docked left like the chargers filter
 *  sidebar; stacks above the comparison on narrow screens. */
export function ComparisonOptionsSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const differencesOnly = useComparisonStore((state) => state.differencesOnly)
  const setDifferencesOnly = useComparisonStore((state) => state.setDifferencesOnly)
  const highlightDifferences = useComparisonStore((state) => state.highlightDifferences)
  const setHighlightDifferences = useComparisonStore((state) => state.setHighlightDifferences)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show comparison options"
        className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground md:sticky md:top-14 md:h-[calc(100svh-3.5rem)] md:w-10 md:flex-col md:border-r md:border-b-0 md:px-0 md:py-4"
      >
        <SlidersHorizontal className="size-4" />
        <ChevronRight className="size-4" />
      </button>
    )
  }

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b border-border p-4 md:sticky md:top-14 md:h-[calc(100svh-3.5rem)] md:w-64 md:overflow-y-auto md:border-r md:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Comparison options</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(true)}
          aria-label="Hide comparison options"
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <Section title="Differences">
        <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
          Show differences only
          <Switch checked={differencesOnly} onCheckedChange={setDifferencesOnly} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
          Highlight differences
          <Switch checked={highlightDifferences} onCheckedChange={setHighlightDifferences} />
        </label>
      </Section>

      {highlightDifferences && (
        <>
          <Separator />

          <Section title="Legend">
            <p className="text-xs text-muted-foreground">
              The <span className="font-medium text-primary">outlined</span> charger is the
              reference; use its checkbox to change it.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <LegendSwatch tone="better">Better</LegendSwatch>
              <LegendSwatch tone="worse">Worse</LegendSwatch>
              <LegendSwatch tone="differs">Just differs</LegendSwatch>
            </div>
          </Section>
        </>
      )}
    </aside>
  )
}
