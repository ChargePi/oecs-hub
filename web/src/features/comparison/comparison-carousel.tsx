import { Link } from 'react-router'
import { GitCompare, LayoutGrid, Table2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ChargerVariant } from '@/lib/oecs/types'
import { useIsSimplified } from '@/lib/preferences/use-preferences'
import {
  MAX_COMPARISON_ITEMS,
  useComparisonStore,
  type ComparisonViewMode,
} from '@/stores/comparison-store'
import { AddChargerControl } from './add-charger-control'
import {
  ComparisonGroupCell,
  ComparisonHeaderCell,
  ComparisonPricingCell,
  ComparisonRatingsCell,
} from './comparison-card'
import { rowDiffers } from './comparison-diff'
import { ComparisonOptionsSidebar } from './comparison-options-sidebar'
import { chargerTypeGroup, comparisonGroups, type ComparisonGroup } from './comparison-rows'
import { ComparisonTable } from './comparison-table'
import { EvaluateWithAgentButton } from './evaluate-with-agent-button'

function ComparisonCarousel({
  variants,
  baseline,
  identityGroup,
  groups,
}: {
  variants: ChargerVariant[]
  baseline: ChargerVariant
  identityGroup: ComparisonGroup
  groups: ComparisonGroup[]
}) {
  const remove = useComparisonStore((state) => state.remove)
  const setReference = useComparisonStore((state) => state.setReference)
  const canAddMore = variants.length < MAX_COMPARISON_ITEMS

  return (
    <div className="overflow-x-auto pb-4">
      <div className="mx-auto flex w-fit items-stretch gap-4">
        <div
          className="grid gap-x-4"
          style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(560px, 640px))` }}
        >
          {variants.map((variant) => (
            <ComparisonHeaderCell
              key={variant.id}
              rows={identityGroup.rows}
              variant={variant}
              baseline={baseline}
              onRemove={() => remove(variant.id)}
              onSetReference={() => setReference(variant.id)}
            />
          ))}

          {variants.map((variant) => (
            <ComparisonRatingsCell key={variant.id} variant={variant} baseline={baseline} />
          ))}

          {groups.map((group) =>
            variants.map((variant) => (
              <ComparisonGroupCell
                key={`${group.title}-${variant.id}`}
                group={group}
                variant={variant}
                baseline={baseline}
              />
            )),
          )}

          {variants.map((variant) => (
            <ComparisonPricingCell key={variant.id} variant={variant} baseline={baseline} />
          ))}
        </div>

        {canAddMore && <AddChargerControl />}
      </div>
    </div>
  )
}

export function ComparisonView({ variants }: { variants: ChargerVariant[] }) {
  const referenceId = useComparisonStore((state) => state.referenceId)
  const simplified = useIsSimplified()
  const storedViewMode = useComparisonStore((state) => state.viewMode)
  const viewMode: ComparisonViewMode = simplified ? 'table' : storedViewMode
  const setViewMode = useComparisonStore((state) => state.setViewMode)
  const differencesOnly = useComparisonStore((state) => state.differencesOnly)
  const baseline = variants.find((v) => v.id === referenceId) ?? variants[0]
  const canAddMore = variants.length < MAX_COMPARISON_ITEMS

  const allGroups = [chargerTypeGroup, ...comparisonGroups]
  const [identityGroup, ...groups] = allGroups.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => !differencesOnly || rowDiffers(row, variants, baseline)),
  }))
  const visibleGroups = groups.filter((group) => group.rows.length > 0)

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <ComparisonOptionsSidebar />

      <div className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <div className="mx-auto mb-4 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canAddMore && <AddChargerControl compact />}
            <EvaluateWithAgentButton
              variants={variants}
              label="Compare with AI"
              variant="default"
            />
          </div>
          {!simplified && (
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ComparisonViewMode)}
            >
              <TabsList>
                <TabsTrigger value="cards">
                  <LayoutGrid />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="table">
                  <Table2 />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {viewMode === 'table' ? (
          <ComparisonTable
            variants={variants}
            baseline={baseline}
            groups={[identityGroup, ...visibleGroups].filter((group) => group.rows.length > 0)}
          />
        ) : (
          <ComparisonCarousel
            variants={variants}
            baseline={baseline}
            identityGroup={identityGroup}
            groups={visibleGroups}
          />
        )}
      </div>
    </div>
  )
}

export function EmptyComparisonState() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border px-10 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GitCompare className="size-6" />
        </div>
        <p className="text-muted-foreground">Add a variant to start comparing.</p>
        <Button asChild>
          <Link to="/chargers">Browse chargers</Link>
        </Button>
      </div>
    </div>
  )
}
