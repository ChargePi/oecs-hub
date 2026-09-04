import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Background, Controls, ReactFlow, ReactFlowProvider, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { GraphNodeData } from '@/features/graph/layout'
import { buildMultiManufacturerGraphLayout } from '@/features/graph/multi-manufacturer-layout'
import type { GraphSelection } from '@/features/graph/node-detail-sheet'
import { ManufacturerNode } from '@/features/graph/nodes/manufacturer-node'
import { ProductNode } from '@/features/graph/nodes/product-node'
import { VariantNode } from '@/features/graph/nodes/variant-node'
import { registryClient } from '@/lib/registry/client'
import type { ChargerFilters, ManufacturerGraph } from '@/lib/registry/types'

const nodeTypes = {
  manufacturer: ManufacturerNode,
  product: ProductNode,
  variant: VariantNode,
}

// There's no dedicated "which manufacturers match these filters" endpoint, so this scans a
// large page of search results and derives the distinct manufacturer set from it - mirroring
// the same "first N results considered" tolerance registryClient.searchCatalog already
// accepts. Rendering itself is capped separately (MAX_MANUFACTURERS) for readability.
const SCAN_PAGE_SIZE = 200
const MAX_MANUFACTURERS = 15

export function GraphView({
  filters,
  onSelectNode,
}: {
  filters: ChargerFilters
  onSelectNode: (selection: GraphSelection) => void
}) {
  const { data: page, isLoading: isSearching } = useQuery({
    queryKey: ['charger-search-graph-scan', filters],
    queryFn: () => registryClient.searchChargers({ filters, pageSize: SCAN_PAGE_SIZE }),
  })

  const manufacturerIds = useMemo(() => {
    const seen = new Set<string>()
    for (const item of page?.items ?? []) seen.add(item.manufacturer.id)
    return [...seen]
  }, [page])

  const shownIds = manufacturerIds.slice(0, MAX_MANUFACTURERS)
  const truncated = manufacturerIds.length > MAX_MANUFACTURERS

  const graphQueries = useQueries({
    queries: shownIds.map((id) => ({
      queryKey: ['manufacturer-graph', id],
      queryFn: () => registryClient.getManufacturerGraph(id),
    })),
  })

  const graphs = graphQueries.map((q) => q.data).filter((g): g is ManufacturerGraph => g != null)
  const isLoading = isSearching || graphQueries.some((q) => q.isLoading)

  const { nodes, edges } = useMemo(() => buildMultiManufacturerGraphLayout(graphs), [graphs])

  function handleNodeClick(_event: React.MouseEvent, node: Node<GraphNodeData>) {
    if (node.data.kind === 'manufacturer') {
      const { manufacturer } = node.data
      const graph = graphs.find((g) => g.manufacturer.id === manufacturer.id)
      onSelectNode({
        kind: 'manufacturer',
        manufacturer,
        products: graph?.products ?? [],
      })
    } else if (node.data.kind === 'product') {
      onSelectNode({ kind: 'product', product: node.data.product })
    } else {
      onSelectNode({ kind: 'variant', variant: node.data.variant })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading graph…
      </div>
    )
  }

  if (manufacturerIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No chargers match these filters.
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      {truncated && (
        <div className="absolute inset-x-0 top-0 z-10 bg-muted/90 px-4 py-2 text-center text-xs text-muted-foreground backdrop-blur">
          Showing {shownIds.length} of {manufacturerIds.length} matching manufacturers — narrow your
          filters to see the rest.
        </div>
      )}
      <div className="h-[calc(100svh-3.5rem)] w-full">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            proOptions={{ hideAttribution: true }}
            fitView
            colorMode="dark"
            defaultEdgeOptions={{ style: { stroke: 'var(--color-border)', strokeWidth: 1.5 } }}
          >
            <Background color="var(--color-border)" gap={24} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}
