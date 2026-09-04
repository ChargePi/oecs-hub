import type { CategoryRating, ChargerVariant, Manufacturer, Product } from '@/lib/oecs/types'

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

/** One generic OECS field_filter: field is a dot-path (e.g. "hardware.connectors.type"),
 *  restricted server-side to a fixed allow-list; values are OR-matched. */
export interface FieldFilterValue {
  field: string
  values: string[]
}

/** Filters accepted by RegistryClient.searchChargers. Every OECS-schema-derived facet is
 *  expressed via `fields` (see features/explore-chargers/filter-manifest.ts); query,
 *  manufacturerId, and the power range are dedicated since they aren't OECS field_filters. */
export interface ChargerFilters {
  query?: string
  manufacturerId?: string
  minPowerKw?: number
  maxPowerKw?: number
  fields: FieldFilterValue[]
}

export interface ChargerSearchPage {
  items: ChargerVariant[]
  nextPageToken: string
  totalSize: number
}

export type SubmissionStatus = 'unspecified' | 'submitted' | 'verified' | 'rejected'

export interface SubmitChargerSpecResult {
  id: string
  status: SubmissionStatus
}

export interface SubmitVariantRatingInput {
  categoryName: string
  score: number
}

export interface SubmitVariantRatingResult {
  variantId: string
  ratings: CategoryRating[]
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
  /** Paginated, filtered charger search - backs the /explore grid and graph views. */
  searchChargers(params: {
    filters: ChargerFilters
    pageSize: number
    pageToken?: string
  }): Promise<ChargerSearchPage>
  /**
   * Submits a raw OECS charger spec for review. The server derives the submitter from
   * the authenticated session (via the Traefik/Oathkeeper edge) - callers don't (and
   * can't) pass an identity here.
   */
  submitChargerSpec(spec: Uint8Array): Promise<SubmitChargerSpecResult>
  /**
   * Submits an individual account's per-category scores for a charger variant. The server
   * derives the rater from the authenticated session, same as submitChargerSpec, and rejects
   * the call unless it's an individual (not manufacturer) account.
   */
  submitVariantRating(
    variantId: string,
    ratings: SubmitVariantRatingInput[],
  ): Promise<SubmitVariantRatingResult>
}
