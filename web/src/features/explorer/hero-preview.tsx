import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, GitCompare } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { formatPricing, humanize } from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { registryClient } from '@/lib/registry/client'
import { cn } from '@/lib/utils'
import { useComparisonStore } from '@/stores/comparison-store'
import { ProductImage } from '@/features/product/product-image'

const PREVIEW_SIZE = 3

function maxPowerKw(variant: ChargerVariant) {
  return variant.hardware.electrical?.output?.maxPower?.value
}

/** Up to three chargers, preferring ones with a known max power from different manufacturers
 *  so the preview reads as a real comparison. */
function pickPreviewChargers(variants: ChargerVariant[]) {
  const ranked = [...variants].sort(
    (a, b) => Number(maxPowerKw(b) != null) - Number(maxPowerKw(a) != null),
  )
  const picked: ChargerVariant[] = []
  const manufacturers = new Set<string>()
  for (const variant of ranked) {
    if (manufacturers.has(variant.manufacturer.id)) continue
    manufacturers.add(variant.manufacturer.id)
    picked.push(variant)
  }
  for (const variant of ranked) {
    if (!picked.includes(variant)) picked.push(variant)
  }
  return picked.slice(0, PREVIEW_SIZE)
}

type PreviewRow = {
  label: string
  value: (variant: ChargerVariant) => ReactNode
  best?: (variants: ChargerVariant[]) => string | undefined
}

const ROWS: PreviewRow[] = [
  {
    label: 'Max power',
    value: (v) => (maxPowerKw(v) != null ? `${maxPowerKw(v)} kW` : '—'),
    best: (vs) => {
      const top = vs.reduce((a, b) => ((maxPowerKw(b) ?? 0) > (maxPowerKw(a) ?? 0) ? b : a))
      return maxPowerKw(top) != null ? top.id : undefined
    },
  },
  {
    label: 'Connectors',
    value: (v) =>
      [...new Set(v.hardware.connectors.map((c) => c.type))].map(humanize).join(', ') || '—',
  },
  {
    label: 'Protocols',
    value: (v) =>
      v.software.protocols.map((p) => `${humanize(p.name)} ${p.version}`.trim()).join(', ') ||
      '—',
  },
  {
    label: 'Price',
    value: (v) => formatPricing(v.pricing)?.[0] ?? 'On enquiry',
  },
]

export function HeroPreview() {
  const navigate = useNavigate()
  const { data: chargers, isLoading } = useQuery({
    queryKey: ['hero-preview'],
    queryFn: async () => {
      const page = await registryClient.searchChargers({
        filters: { fields: [], minRatings: {} },
        pageSize: 24,
      })
      return pickPreviewChargers(page.items)
    },
    staleTime: Infinity,
  })

  if (isLoading) return <Skeleton className="h-80 w-full rounded-2xl" />
  if (!chargers || chargers.length < 2) return null

  function compareThese() {
    useComparisonStore.setState({ variantIds: chargers!.map((c) => c.id), referenceId: null })
    navigate('/compare')
  }

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-x-12 -top-8 bottom-0 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-2xl bg-card/90 shadow-2xl shadow-black/50 ring-1 ring-foreground/10 backdrop-blur">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-foreground/25 to-transparent"
        />
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr>
              <th className="hidden w-32 sm:table-cell" />
              {chargers.map((charger, i) => (
                <th
                  key={charger.id}
                  scope="col"
                  className={cn('px-4 pt-5 pb-4 align-top font-normal', i === 2 && 'hidden sm:table-cell')}
                >
                  <Link
                    to={`/chargers/${charger.manufacturer.id}?variant=${charger.id}`}
                    className="group/charger flex flex-col items-center gap-3 rounded-xl text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ProductImage
                      src={charger.model.productImageUrl}
                      alt={charger.model.name}
                      className="size-20 rounded-xl bg-background/60 ring-1 ring-transparent transition-[box-shadow] group-hover/charger:ring-primary/40"
                    />
                    <div className="min-w-0 max-w-full">
                      <p className="truncate font-medium text-foreground transition-colors group-hover/charger:text-primary">
                        {charger.model.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {charger.manufacturer.name}
                      </p>
                    </div>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const bestId = row.best?.(chargers)
              return (
                <tr key={row.label} className="border-t border-border/60">
                  <th
                    scope="row"
                    className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell"
                  >
                    {row.label}
                  </th>
                  {chargers.map((charger, i) => (
                    <td
                      key={charger.id}
                      className={cn(
                        'truncate px-4 py-3 text-center font-mono text-xs tabular-nums',
                        charger.id === bestId ? 'font-semibold text-primary' : 'text-foreground/90',
                        i === 2 && 'hidden sm:table-cell',
                      )}
                    >
                      {row.value(charger)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex justify-center border-t border-border/60 p-4">
          <button
            type="button"
            onClick={compareThese}
            className="group/compare flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary ring-1 ring-primary/30 transition-colors outline-none hover:bg-primary/15 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GitCompare className="size-4" aria-hidden="true" />
            Compare these in full
            <ArrowRight
              className="size-3.5 transition-transform motion-safe:group-hover/compare:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
