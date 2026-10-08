import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { NodeDetailPanel, type GraphSelection } from '@/features/graph/node-detail-sheet'
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
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  // Whether the filters were collapsed by opening details (rather than by the user), so
  // closing the details only re-expands what it collapsed itself.
  const [filtersAutoCollapsed, setFiltersAutoCollapsed] = useState(false)

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

  // The details panel docks on the left beside the filters, so make room for it by
  // collapsing the filters to their rail while something is selected.
  function select(next: GraphSelection) {
    if (next != null && selection == null && !filtersCollapsed) {
      setFiltersCollapsed(true)
      setFiltersAutoCollapsed(true)
    } else if (next == null && filtersAutoCollapsed) {
      setFiltersCollapsed(false)
      setFiltersAutoCollapsed(false)
    }
    setSelection(next)
  }

  function setFiltersCollapsedByUser(collapsed: boolean) {
    setFiltersCollapsed(collapsed)
    setFiltersAutoCollapsed(false)
  }

  function selectVariant(variant: ChargerVariant) {
    select({ kind: 'variant', variant })
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem-1px)]">
      <FilterSidebar
        filters={filterState}
        onChange={updateFilters}
        collapsed={filtersCollapsed}
        onCollapsedChange={setFiltersCollapsedByUser}
      />
      <NodeDetailPanel selection={selection} onSelectionChange={select} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex items-center justify-end border-b border-border p-4">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Chargers</h1>
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
          <GridView
            filters={chargerFilters}
            onSelectVariant={selectVariant}
            selectedVariantId={selection?.kind === 'variant' ? selection.variant.id : undefined}
          />
        ) : (
          <GraphView filters={chargerFilters} onSelectNode={select} />
        )}
      </div>
    </div>
  )
}
