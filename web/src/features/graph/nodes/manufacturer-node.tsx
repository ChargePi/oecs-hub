import { Handle, Position, type NodeProps } from '@xyflow/react'

import { ManufacturerLogo } from '@/features/product/manufacturer-logo'
import type { GraphNodeData } from '../layout'

export function ManufacturerNode({ data, selected }: NodeProps & { data: GraphNodeData }) {
  if (data.kind !== 'manufacturer') return null
  const { manufacturer } = data

  return (
    <div
      className={`flex w-56 items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-md transition-colors ${
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border'
      }`}
    >
      <Handle type="source" position={Position.Right} className="!bg-primary" />
      <ManufacturerLogo
        logoUrl={manufacturer.logoUrl}
        className="size-9"
        iconClassName="size-4.5"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{manufacturer.name}</p>
        {manufacturer.country && (
          <p className="truncate text-xs text-muted-foreground">{manufacturer.country}</p>
        )}
      </div>
    </div>
  )
}
