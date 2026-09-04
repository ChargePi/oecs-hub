import type { ChargerFilters } from '@/lib/registry/types'
import { ALL_FACETS } from './filter-manifest'

export type ExploreView = 'grid' | 'graph'

export interface FilterState {
  query: string
  manufacturerId?: string
  countries: string[]
  minPowerKw?: number
  maxPowerKw?: number
  /** facet id -> selected values (multi-select options, or ["true"] for an enabled toggle) */
  facets: Record<string, string[]>
}

export const EMPTY_FILTER_STATE: FilterState = { query: '', countries: [], facets: {} }

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function parseFiltersFromSearchParams(params: URLSearchParams): FilterState {
  const facets: Record<string, string[]> = {}
  for (const facet of ALL_FACETS) {
    const values = parseList(params.get(facet.id))
    if (values.length > 0) facets[facet.id] = values
  }

  const minPowerKw = params.get('minKw')
  const maxPowerKw = params.get('maxKw')

  return {
    query: params.get('q') ?? '',
    manufacturerId: params.get('m') ?? undefined,
    countries: parseList(params.get('country')),
    minPowerKw: minPowerKw ? Number(minPowerKw) : undefined,
    maxPowerKw: maxPowerKw ? Number(maxPowerKw) : undefined,
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
    if (facetIds.has(key) || ['q', 'm', 'country', 'minKw', 'maxKw'].includes(key)) {
      params.delete(key)
    }
  }

  if (state.query) params.set('q', state.query)
  if (state.manufacturerId) params.set('m', state.manufacturerId)
  if (state.countries.length > 0) params.set('country', state.countries.join(','))
  if (state.minPowerKw != null) params.set('minKw', String(state.minPowerKw))
  if (state.maxPowerKw != null) params.set('maxKw', String(state.maxPowerKw))

  for (const [facetId, values] of Object.entries(state.facets)) {
    if (values.length > 0) params.set(facetId, values.join(','))
  }

  return params
}

export function isFilterStateEmpty(state: FilterState): boolean {
  return (
    !state.query &&
    !state.manufacturerId &&
    state.countries.length === 0 &&
    state.minPowerKw == null &&
    state.maxPowerKw == null &&
    Object.keys(state.facets).length === 0
  )
}

/** Converts UI filter state into the shape RegistryClient.searchChargers expects. */
export function filterStateToChargerFilters(state: FilterState): ChargerFilters {
  const fields = ALL_FACETS.filter((facet) => (state.facets[facet.id]?.length ?? 0) > 0).map(
    (facet) => ({ field: facet.field, values: state.facets[facet.id] }),
  )

  if (state.countries.length > 0) {
    fields.push({ field: 'manufacturer.country', values: state.countries })
  }

  return {
    query: state.query || undefined,
    manufacturerId: state.manufacturerId,
    minPowerKw: state.minPowerKw,
    maxPowerKw: state.maxPowerKw,
    fields,
  }
}
