import { useMemo } from 'react'
import { Background, Controls, ReactFlow, ReactFlowProvider, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { Manufacturer, Product } from '@/lib/oecs/types'
import { buildGraphLayout, type GraphNodeData } from './layout'
import { ManufacturerNode } from './nodes/manufacturer-node'
import { ProductNode } from './nodes/product-node'
import { VariantNode } from './nodes/variant-node'
import type { GraphSelection } from './node-detail-sheet'

const nodeTypes = {
  manufacturer: ManufacturerNode,
  product: ProductNode,
  variant: VariantNode,
}

export function ChargerGraph({
  manufacturer,
  products,
  onSelectNode,
  focusVariantId,
}: {
  manufacturer: Manufacturer
  products: Product[]
  onSelectNode: (selection: GraphSelection) => void
  focusVariantId?: string
}) {
  const { nodes, edges } = useMemo(
    () => buildGraphLayout(manufacturer, products, focusVariantId),
    [manufacturer, products, focusVariantId],
  )

  function handleNodeClick(_event: React.MouseEvent, node: Node<GraphNodeData>) {
    if (node.data.kind === 'manufacturer') {
      onSelectNode({ kind: 'manufacturer', manufacturer: node.data.manufacturer, products })
    } else if (node.data.kind === 'product') {
      onSelectNode({ kind: 'product', product: node.data.product })
    } else {
      onSelectNode({ kind: 'variant', variant: node.data.variant })
    }
  }

  return (
    <div className="h-[calc(100svh-3.5rem)] w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={
            focusVariantId ? { nodes: [{ id: `variant:${focusVariantId}` }] } : undefined
          }
          colorMode="dark"
          defaultEdgeOptions={{ style: { stroke: 'var(--color-border)', strokeWidth: 1.5 } }}
        >
          <Background color="var(--color-border)" gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
