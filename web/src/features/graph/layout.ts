import type { Edge, Node } from '@xyflow/react'

import type { Manufacturer, Product } from '@/lib/oecs/types'

const COLUMN_X = { manufacturer: 0, product: 320, variant: 640 }
const ROW_HEIGHT = 84

export type GraphNodeData =
  | { kind: 'manufacturer'; manufacturer: Manufacturer }
  | { kind: 'product'; product: Product }
  | { kind: 'variant'; variant: Product['variants'][number] }

export function buildGraphLayout(
  manufacturer: Manufacturer,
  products: Product[],
  selectedVariantId?: string,
) {
  const nodes: Node<GraphNodeData>[] = []
  const edges: Edge[] = []

  let row = 0
  const productCenters: number[] = []

  for (const product of products) {
    const startRow = row
    for (const variant of product.variants) {
      nodes.push({
        id: `variant:${variant.id}`,
        type: 'variant',
        position: { x: COLUMN_X.variant, y: row * ROW_HEIGHT },
        data: { kind: 'variant', variant },
        selected: variant.id === selectedVariantId,
      })
      edges.push({
        id: `edge:${product.id}->${variant.id}`,
        source: `product:${product.id}`,
        target: `variant:${variant.id}`,
      })
      row += 1
    }
    const endRow = row - 1
    const centerY = ((startRow + endRow) / 2) * ROW_HEIGHT
    productCenters.push(centerY)

    nodes.push({
      id: `product:${product.id}`,
      type: 'product',
      position: { x: COLUMN_X.product, y: centerY },
      data: { kind: 'product', product },
    })
    edges.push({
      id: `edge:manufacturer->${product.id}`,
      source: 'manufacturer',
      target: `product:${product.id}`,
    })
  }

  const manufacturerY =
    productCenters.length > 0 ? (Math.min(...productCenters) + Math.max(...productCenters)) / 2 : 0

  nodes.unshift({
    id: 'manufacturer',
    type: 'manufacturer',
    position: { x: COLUMN_X.manufacturer, y: manufacturerY },
    data: { kind: 'manufacturer', manufacturer },
  })

  return { nodes, edges }
}
