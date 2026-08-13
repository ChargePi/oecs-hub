import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Factory } from 'lucide-react'

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
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Factory className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{manufacturer.name}</p>
        {manufacturer.country && (
          <p className="truncate text-xs text-muted-foreground">{manufacturer.country}</p>
        )}
      </div>
    </div>
  )
}
