import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'

import type { GraphNodeData } from '../layout'

export function ProductNode({ data, selected }: NodeProps & { data: GraphNodeData }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (data.kind !== 'product') return null
  const { product } = data
  const imageUrl = !imageFailed
    ? product.variants.find((v) => v.model.productImageUrl)?.model.productImageUrl
    : undefined

  const types = [...new Set(product.variants.map((v) => v.model.type))]
  const powers = product.variants
    .map((v) => v.hardware.electrical?.output?.maxPower?.value)
    .filter((value) => value != null)
  const powerLabel =
    powers.length > 0
      ? Math.min(...powers) === Math.max(...powers)
        ? `${Math.max(...powers)} kW`
        : `${Math.min(...powers)}–${Math.max(...powers)} kW`
      : undefined
  const variantCount = `${product.variants.length} variant${product.variants.length === 1 ? '' : 's'}`
  const subtitle = [variantCount, types.join('/'), powerLabel].filter(Boolean).join(' · ')

  return (
    <div
      className={`flex w-52 items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm transition-colors ${
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <Handle type="source" position={Position.Right} className="!bg-primary" />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-6 shrink-0 rounded-md object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Layers className="size-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{product.series}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}
