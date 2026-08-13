import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { registryClient } from '@/lib/registry/client'
import { ChargerGraph } from './charger-graph'
import { NodeDetailSheet, type GraphSelection } from './node-detail-sheet'

export function GraphPage() {
  const { manufacturerId } = useParams<{ manufacturerId: string }>()
  const [searchParams] = useSearchParams()
  const focusVariantId = searchParams.get('variant') ?? undefined
  const [selection, setSelection] = useState<GraphSelection>(null)
  // Tracks which focusVariantId we've already auto-opened a sheet for, so closing the sheet
  // (selection -> null) doesn't get immediately overridden by the auto-open on the next render —
  // adjusting state during render (React's documented pattern for "derive state from a changed
  // prop") rather than in an effect, since the effect form triggers an extra commit for no benefit.
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | undefined>(undefined)

  const { data: graph, isLoading } = useQuery({
    queryKey: ['manufacturer-graph', manufacturerId],
    queryFn: () => registryClient.getManufacturerGraph(manufacturerId!),
    enabled: !!manufacturerId,
  })

  if (graph && focusVariantId && autoOpenedFor !== focusVariantId) {
    setAutoOpenedFor(focusVariantId)
    const variant = graph.products.flatMap((p) => p.variants).find((v) => v.id === focusVariantId)
    if (variant) setSelection({ kind: 'variant', variant })
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading graph…
      </div>
    )
  }

  if (!graph) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>No manufacturer found.</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-foreground hover:underline">
          <ArrowLeft className="size-4" />
          Back to search
        </Link>
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <ChargerGraph
        manufacturer={graph.manufacturer}
        products={graph.products}
        onSelectNode={setSelection}
        focusVariantId={focusVariantId}
      />
      <NodeDetailSheet selection={selection} onSelectionChange={setSelection} />
    </div>
  )
}
