import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'

import { formatQuantity } from '@/lib/oecs/format'
import { useComparisonStore } from '@/stores/comparison-store'
import type { GraphNodeData } from '../layout'

export function VariantNode({ data, selected }: NodeProps & { data: GraphNodeData }) {
  const inComparison = useComparisonStore((state) =>
    data.kind === 'variant' ? state.has(data.variant.id) : false,
  )
  const [imageFailed, setImageFailed] = useState(false)

  if (data.kind !== 'variant') return null
  const { variant } = data
  const maxPower = formatQuantity(variant.hardware.electrical?.output?.maxPower)
  const subtitle = [variant.model.type, maxPower].filter(Boolean).join(' · ')
  const imageUrl = !imageFailed ? variant.model.productImageUrl : undefined

  return (
    <div
      className={`flex w-52 items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm transition-colors ${
        selected
          ? 'border-primary ring-2 ring-primary/40'
          : inComparison
            ? 'border-primary/60'
            : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-6 shrink-0 rounded-md object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Zap className="size-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{variant.model.name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {inComparison && <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" />}
    </div>
  )
}
