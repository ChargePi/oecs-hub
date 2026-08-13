import type { ChargerVariant, Manufacturer, Product } from '@/lib/oecs/types'

export interface ManufacturerSummary extends Manufacturer {
  productCount: number
  variantCount: number
}

export interface SearchResult {
  type: 'manufacturer' | 'product'
  manufacturerId: string
  manufacturerName: string
  /** Present when type is "product". */
  productId?: string
  label: string
}

export interface ManufacturerGraph {
  manufacturer: Manufacturer
  products: Product[]
}

/**
 * Everything the UI needs to read OECS registry data through. Backed today by
 * MockRegistryClient (in-memory fixtures); a real HTTP/gRPC implementation of this same
 * interface is a drop-in replacement — see registry-client.ts.
 */
export interface RegistryClient {
  listManufacturers(): Promise<ManufacturerSummary[]>
  getManufacturerGraph(manufacturerId: string): Promise<ManufacturerGraph | null>
  searchCatalog(query: string): Promise<SearchResult[]>
  getVariant(variantId: string): Promise<ChargerVariant | null>
  listVariants(): Promise<ChargerVariant[]>
}
