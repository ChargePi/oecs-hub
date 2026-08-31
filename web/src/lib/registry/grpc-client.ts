import type { ChargerVariant, Product } from '@/lib/oecs/types'
import { RegistryServiceClient } from './gen/registry/v1/RegistryServiceClientPb'
import * as registry_v1_registry_pb from './gen/registry/v1/registry_pb'
import {
  chargerVariantFromProto,
  chargerVariantFromSummary,
  collectAllPages,
  isNotFound,
  manufacturerFromProto,
  manufacturerSummaryFromProto,
  mapGrpcError,
  submissionStatusFromProto,
} from './grpc-mapping'
import type {
  ManufacturerGraph,
  ManufacturerSummary,
  RegistryClient,
  SearchResult,
  SubmitChargerSpecResult,
} from './types'

const BASE_URL = '/api'
const MAX_PAGE_SIZE = 200
const SEARCH_PAGE_SIZE = 20
const MAX_SEARCH_RESULTS = 8

export class GrpcRegistryClient implements RegistryClient {
  private client = new RegistryServiceClient(BASE_URL, null, null)

  async listManufacturers(): Promise<ManufacturerSummary[]> {
    try {
      const items = await collectAllPages(async (pageToken) => {
        const req = new registry_v1_registry_pb.GetManufacturersRequest()
        req.setPageSize(MAX_PAGE_SIZE)
        req.setPageToken(pageToken)
        const resp = await this.client.getManufacturers(req, {})
        return { items: resp.getManufacturersList(), nextPageToken: resp.getNextPageToken() }
      })
      return items.map(manufacturerSummaryFromProto).sort((a, b) => a.name.localeCompare(b.name))
    } catch (err) {
      mapGrpcError(err, 'listManufacturers')
    }
  }

  async getManufacturerGraph(manufacturerId: string): Promise<ManufacturerGraph | null> {
    const req = new registry_v1_registry_pb.GetManufacturerRequest()
    req.setId(manufacturerId)

    try {
      const resp = await this.client.getManufacturer(req, {})
      const manufacturer = resp.getManufacturer()
      if (!manufacturer) return null

      const products: Product[] = resp.getProductsList().map((p) => ({
        id: p.getId(),
        manufacturerId: p.getManufacturerId(),
        series: p.getSeries(),
        variants: p.getVariantsList().map(chargerVariantFromSummary),
      }))

      return { manufacturer: manufacturerFromProto(manufacturer), products }
    } catch (err) {
      if (isNotFound(err)) return null
      mapGrpcError(err, `getManufacturerGraph(${manufacturerId})`)
    }
  }

  /**
   * Neither RPC has a dedicated search endpoint, so this issues both filtered list calls in
   * parallel — SearchChargers' `query` matches manufacturer name/model name/series server-side —
   * and groups the matching variants into products client-side, mirroring MockRegistryClient's
   * grouping. Known limitation: only the first SEARCH_PAGE_SIZE matches of each kind are
   * considered.
   */
  async searchCatalog(query: string): Promise<SearchResult[]> {
    const normalized = query.trim()
    if (!normalized) return []

    const manufacturersReq = new registry_v1_registry_pb.GetManufacturersRequest()
    manufacturersReq.setQuery(normalized)
    manufacturersReq.setPageSize(SEARCH_PAGE_SIZE)

    const chargersReq = new registry_v1_registry_pb.SearchChargersRequest()
    chargersReq.setQuery(normalized)
    chargersReq.setPageSize(SEARCH_PAGE_SIZE)

    let manufacturersResp: registry_v1_registry_pb.GetManufacturersResponse
    let chargersResp: registry_v1_registry_pb.SearchChargersResponse
    try {
      ;[manufacturersResp, chargersResp] = await Promise.all([
        this.client.getManufacturers(manufacturersReq, {}),
        this.client.searchChargers(chargersReq, {}),
      ])
    } catch (err) {
      mapGrpcError(err, `searchCatalog(${query})`)
    }

    const results: SearchResult[] = []
    for (const ms of manufacturersResp.getManufacturersList()) {
      const manufacturer = ms.getManufacturer()
      if (!manufacturer) continue
      results.push({
        type: 'manufacturer',
        manufacturerId: manufacturer.getId(),
        manufacturerName: manufacturer.getName(),
        label: manufacturer.getName(),
      })
    }

    const seenProducts = new Set<string>()
    for (const summary of chargersResp.getVariantsList()) {
      const series = summary.hasSeries() ? summary.getSeries() : summary.getModelName()
      const productId = `${summary.getManufacturerId()}-${series}`
      if (seenProducts.has(productId)) continue
      seenProducts.add(productId)
      results.push({
        type: 'product',
        manufacturerId: summary.getManufacturerId(),
        manufacturerName: summary.getManufacturerName(),
        productId,
        label: `${summary.getManufacturerName()} ${series}`,
      })
    }

    return results.slice(0, MAX_SEARCH_RESULTS)
  }

  async getVariant(variantId: string): Promise<ChargerVariant | null> {
    const req = new registry_v1_registry_pb.GetChargerRequest()
    req.setId(variantId)

    try {
      const resp = await this.client.getCharger(req, {})
      const variant = resp.getVariant()
      return variant ? chargerVariantFromProto(variant) : null
    } catch (err) {
      if (isNotFound(err)) return null
      mapGrpcError(err, `getVariant(${variantId})`)
    }
  }

  /**
   * Backs the "add charger" picker, which only reads id/model.name/manufacturer.name — served
   * from SearchChargers summaries (paged through in full) rather than one GetCharger call per
   * catalog entry, since the picker never needs the full spec.
   */
  async listVariants(): Promise<ChargerVariant[]> {
    try {
      const items = await collectAllPages(async (pageToken) => {
        const req = new registry_v1_registry_pb.SearchChargersRequest()
        req.setPageSize(MAX_PAGE_SIZE)
        req.setPageToken(pageToken)
        const resp = await this.client.searchChargers(req, {})
        return { items: resp.getVariantsList(), nextPageToken: resp.getNextPageToken() }
      })
      return items.map(chargerVariantFromSummary)
    } catch (err) {
      mapGrpcError(err, 'listVariants')
    }
  }

  async submitChargerSpec(spec: Uint8Array): Promise<SubmitChargerSpecResult> {
    const req = new registry_v1_registry_pb.SubmitChargerSpecRequest()
    req.setSpec(spec)

    try {
      const resp = await this.client.submitChargerSpec(req, {})
      return { id: resp.getId(), status: submissionStatusFromProto(resp.getStatus()) }
    } catch (err) {
      mapGrpcError(err, 'submitChargerSpec')
    }
  }
}
