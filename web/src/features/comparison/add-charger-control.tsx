import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { registryClient } from '@/lib/registry/client'
import { useComparisonStore } from '@/stores/comparison-store'

export function AddChargerControl() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const variantIds = useComparisonStore((state) => state.variantIds)
  const add = useComparisonStore((state) => state.add)

  const { data: variants = [] } = useQuery({
    queryKey: ['all-variants'],
    queryFn: () => registryClient.listVariants(),
    enabled: open,
  })

  const normalized = query.trim().toLowerCase()
  const available = variants
    .filter((v) => !variantIds.includes(v.id))
    .filter(
      (v) =>
        !normalized ||
        v.model.name.toLowerCase().includes(normalized) ||
        v.manufacturer.name.toLowerCase().includes(normalized),
    )

  function pick(variantId: string) {
    add(variantId)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-full min-h-64 w-[40rem] shrink-0 flex-col items-center justify-center gap-2 self-stretch rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-6" />
        <span className="text-sm font-medium">Add charger</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add to comparison</SheetTitle>
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
                      onClick={() => pick(variant.id)}
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
    </>
  )
}
