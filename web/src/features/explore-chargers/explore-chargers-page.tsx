import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { NodeDetailSheet, type GraphSelection } from '@/features/graph/node-detail-sheet'
import type { ChargerVariant } from '@/lib/oecs/types'
import { useComparisonStore } from '@/stores/comparison-store'
import { FilterSidebar } from './filter-sidebar'
import {
  filterStateToChargerFilters,
  filtersToSearchParams,
  parseFiltersFromSearchParams,
  type ExploreView,
} from './filter-state'
import { GraphView } from './graph-view'
import { GridView } from './grid-view'
import { useChargerSearch } from './use-charger-search'

export function ExploreChargersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterState = parseFiltersFromSearchParams(searchParams)
  const view: ExploreView = searchParams.get('view') === 'graph' ? 'graph' : 'grid'
  const [selection, setSelection] = useState<GraphSelection>(null)

  // The sidebar renders straight off filterState (derived from the URL) so it stays
  // instantly responsive; only the actual search query is debounced, so a text keystroke
  // or slider drag doesn't fire a request per tick.
  const debouncedFilterState = useDebouncedValue(filterState, 300)
  const chargerFilters = filterStateToChargerFilters(debouncedFilterState)

  // Same queryKey as GridView's own useChargerSearch call, so this shares its cache/fetch
  // rather than issuing a second request - it only needs the loaded variants for the
  // "select all filtered" button, not to drive the grid's own rendering.
  const { data: searchData } = useChargerSearch(chargerFilters)
  const filteredVariants = searchData?.pages.flatMap((page) => page.items) ?? []

  const selectedVariantIds = useComparisonStore((state) => state.variantIds)
  const addToComparison = useComparisonStore((state) => state.add)
  const removeFromComparison = useComparisonStore((state) => state.remove)
  const allFilteredSelected =
    filteredVariants.length > 0 && filteredVariants.every((v) => selectedVariantIds.includes(v.id))

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      for (const variant of filteredVariants) removeFromComparison(variant.id)
    } else {
      // add() is a no-op past MAX_COMPARISON_ITEMS and for ids already selected, so this is
      // safe to call for every loaded variant regardless of current selection/capacity.
      for (const variant of filteredVariants) addToComparison(variant.id)
    }
  }

  function updateFilters(next: typeof filterState) {
    setSearchParams(filtersToSearchParams(next, searchParams), { replace: true })
  }

  function setView(next: ExploreView) {
    const params = new URLSearchParams(searchParams)
    params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  function selectVariant(variant: ChargerVariant) {
    setSelection({ kind: 'variant', variant })
  }

  return (
    <div className="flex flex-1">
      <FilterSidebar filters={filterState} onChange={updateFilters} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h1 className="text-lg font-semibold">Explore chargers</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAllFiltered}
              disabled={filteredVariants.length === 0}
            >
              {allFilteredSelected ? 'Deselect all filtered' : 'Select all filtered'}
            </Button>
            <Tabs value={view} onValueChange={(next) => setView(next as ExploreView)}>
              <TabsList>
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="graph">Graph</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        {view === 'grid' ? (
          <GridView filters={chargerFilters} onSelectVariant={selectVariant} />
        ) : (
          <GraphView filters={chargerFilters} onSelectNode={setSelection} />
        )}
      </div>
      <NodeDetailSheet selection={selection} onSelectionChange={setSelection} />
    </div>
  )
}
