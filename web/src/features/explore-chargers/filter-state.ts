import type { ChargerFilters } from '@/lib/registry/types'
import { ALL_FACETS } from './filter-manifest'

export type ExploreView = 'grid' | 'graph'

export interface FilterState {
  query: string
  manufacturerId?: string
  minPowerKw?: number
  maxPowerKw?: number
  priceCurrency: string
  minPrice?: number
  maxPrice?: number
  /** "OCPP" (any version) or "OCPP@1.6" (that version) */
  protocols: string[]
  /** facet id -> selected values (multi-select options, or ["true"] for an enabled toggle) */
  facets: Record<string, string[]>
}

export const DEFAULT_PRICE_CURRENCY = 'EUR'

export const EMPTY_FILTER_STATE: FilterState = {
  query: '',
  priceCurrency: DEFAULT_PRICE_CURRENCY,
  protocols: [],
  facets: {},
}

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function parseFiltersFromSearchParams(params: URLSearchParams): FilterState {
  const facets: Record<string, string[]> = {}
  for (const facet of ALL_FACETS) {
    const values = parseList(params.get(facet.id))
    if (values.length > 0) facets[facet.id] = values
  }

  return {
    query: params.get('q') ?? '',
    manufacturerId: params.get('m') ?? undefined,
    minPowerKw: parseNumber(params.get('minKw')),
    maxPowerKw: parseNumber(params.get('maxKw')),
    priceCurrency: params.get('cur') ?? DEFAULT_PRICE_CURRENCY,
    minPrice: parseNumber(params.get('minPrice')),
    maxPrice: parseNumber(params.get('maxPrice')),
    protocols: parseList(params.get('protocol')),
    facets,
  }
}

export function filtersToSearchParams(
  state: FilterState,
  existing: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing)
  const facetIds = new Set(ALL_FACETS.map((f) => f.id))

  for (const key of [...params.keys()]) {
    if (
      facetIds.has(key) ||
      ['q', 'm', 'minKw', 'maxKw', 'cur', 'minPrice', 'maxPrice', 'protocol'].includes(key)
    ) {
      params.delete(key)
    }
  }

  if (state.query) params.set('q', state.query)
  if (state.manufacturerId) params.set('m', state.manufacturerId)
  if (state.minPowerKw != null) params.set('minKw', String(state.minPowerKw))
  if (state.maxPowerKw != null) params.set('maxKw', String(state.maxPowerKw))
  if (hasPriceRange(state)) {
    params.set('cur', state.priceCurrency)
    if (state.minPrice != null) params.set('minPrice', String(state.minPrice))
    if (state.maxPrice != null) params.set('maxPrice', String(state.maxPrice))
  }

  if (state.protocols.length > 0) params.set('protocol', state.protocols.join(','))

  for (const [facetId, values] of Object.entries(state.facets)) {
    if (values.length > 0) params.set(facetId, values.join(','))
  }

  return params
}

export function protocolToken(name: string, version?: string): string {
  return version ? `${name}@${version}` : name
}

export function parseProtocolToken(token: string): { name: string; version?: string } {
  const at = token.indexOf('@')
  return at < 0 ? { name: token } : { name: token.slice(0, at), version: token.slice(at + 1) }
}

function hasPriceRange(state: FilterState): boolean {
  return state.minPrice != null || state.maxPrice != null
}

export function isFilterStateEmpty(state: FilterState): boolean {
  return (
    !state.query &&
    !state.manufacturerId &&
    state.minPowerKw == null &&
    state.maxPowerKw == null &&
    !hasPriceRange(state) &&
    state.protocols.length === 0 &&
    Object.keys(state.facets).length === 0
  )
}

/** Converts UI filter state into the shape RegistryClient.searchChargers expects. */
export function filterStateToChargerFilters(state: FilterState): ChargerFilters {
  const fields = ALL_FACETS.filter((facet) => (state.facets[facet.id]?.length ?? 0) > 0).map(
    (facet) => ({
      field: facet.field,
      values: state.facets[facet.id].flatMap(
        (value) => facet.options?.find((o) => o.value === value)?.matches ?? [value],
      ),
    }),
  )

  return {
    query: state.query || undefined,
    manufacturerId: state.manufacturerId,
    minPowerKw: state.minPowerKw,
    maxPowerKw: state.maxPowerKw,
    price: hasPriceRange(state)
      ? { currency: state.priceCurrency, min: state.minPrice, max: state.maxPrice }
      : undefined,
    protocols: state.protocols.map(parseProtocolToken),
    fields,
  }
}
