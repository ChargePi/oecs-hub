import type { Edge, Node } from '@xyflow/react'

import type { ManufacturerGraph } from '@/lib/registry/types'
import { buildGraphLayout, type GraphNodeData } from './layout'

const TREE_GAP = 48

/**
 * Lays out one independent tree per manufacturer graph, stacked vertically with a gap
 * between them. There are no real relationships between manufacturers, so this never adds
 * edges across trees - it's multiple independent buildGraphLayout results sharing one
 * canvas, each shifted down past the previous tree's tallest row.
 */
export function buildMultiManufacturerGraphLayout(graphs: ManufacturerGraph[]) {
  const nodes: Node<GraphNodeData>[] = []
  const edges: Edge[] = []
  let yOffset = 0

  for (const graph of graphs) {
    const layout = buildGraphLayout(graph.manufacturer, graph.products)
    if (layout.nodes.length === 0) continue

    const maxY = Math.max(...layout.nodes.map((n) => n.position.y))
    const minY = Math.min(...layout.nodes.map((n) => n.position.y))

    for (const node of layout.nodes) {
      nodes.push({ ...node, position: { ...node.position, y: node.position.y - minY + yOffset } })
    }
    edges.push(...layout.edges)

    yOffset += maxY - minY + TREE_GAP
  }

  return { nodes, edges }
}
