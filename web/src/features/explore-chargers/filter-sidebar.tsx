import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { StarRatingInput } from '@/components/ui/star-rating-input'
import { Switch } from '@/components/ui/switch'
import { RATING_CATEGORIES } from '@/lib/oecs/rating-categories'
import { registryClient } from '@/lib/registry/client'
import { FILTER_GROUPS } from './filter-manifest'
import type { FilterState } from './filter-state'
import { ProtocolFilter } from './protocol-filter'

const MAX_POWER_KW = 400
const PRICE_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN']

function parsePriceInput(value: string): number | undefined {
  if (value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function FilterSidebar({
  filters,
  onChange,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
  /** Controls the collapsed rail from outside; falls back to internal state when omitted. */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = controlledCollapsed ?? internalCollapsed
  function setCollapsed(next: boolean) {
    setInternalCollapsed(next)
    onCollapsedChange?.(next)
  }
  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => registryClient.listManufacturers(),
  })

  function toggleFacetValue(facetId: string, value: string, checked: boolean) {
    const current = filters.facets[facetId] ?? []
    const next = checked ? [...current, value] : current.filter((v) => v !== value)
    const facets = { ...filters.facets }
    if (next.length > 0) facets[facetId] = next
    else delete facets[facetId]
    onChange({ ...filters, facets })
  }

  function setToggle(facetId: string, checked: boolean) {
    const facets = { ...filters.facets }
    if (checked) facets[facetId] = ['true']
    else delete facets[facetId]
    onChange({ ...filters, facets })
  }

  function setMinRating(category: string, stars: number) {
    const minRatings = { ...filters.minRatings }
    if (minRatings[category] === stars) delete minRatings[category]
    else minRatings[category] = stars
    onChange({ ...filters, minRatings })
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show filters"
        className="flex w-10 shrink-0 flex-col items-center gap-2 border-r border-border py-4 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <SlidersHorizontal className="size-4" />
        <ChevronRight className="size-4" />
      </button>
    )
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Filters</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(true)}
          aria-label="Hide filters"
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <Input
        placeholder="Search chargers…"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Manufacturer</span>
        <Select
          value={filters.manufacturerId ?? 'any'}
          onValueChange={(value) =>
            onChange({ ...filters, manufacturerId: value === 'any' ? undefined : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any manufacturer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any manufacturer</SelectItem>
            {manufacturers?.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Power</span>
          <span>
            {filters.minPowerKw ?? 0}–{filters.maxPowerKw ?? MAX_POWER_KW} kW
          </span>
        </div>
        <Slider
          min={0}
          max={MAX_POWER_KW}
          step={5}
          value={[filters.minPowerKw ?? 0, filters.maxPowerKw ?? MAX_POWER_KW]}
          onValueChange={(next) => {
            const [min, max] = next as [number, number]
            onChange({
              ...filters,
              minPowerKw: min > 0 ? min : undefined,
              maxPowerKw: max < MAX_POWER_KW ? max : undefined,
            })
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Price (MSRP)</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Min"
            aria-label="Minimum price"
            value={filters.minPrice ?? ''}
            onChange={(e) => onChange({ ...filters, minPrice: parsePriceInput(e.target.value) })}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Max"
            aria-label="Maximum price"
            value={filters.maxPrice ?? ''}
            onChange={(e) => onChange({ ...filters, maxPrice: parsePriceInput(e.target.value) })}
          />
          <Select
            value={filters.priceCurrency}
            onValueChange={(value) => onChange({ ...filters, priceCurrency: value })}
          >
            <SelectTrigger className="w-24 shrink-0" aria-label="Currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICE_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Accordion type="multiple" className="flex flex-col gap-1">
        <AccordionItem value="ratings">
          <AccordionTrigger>Ratings</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.name} className="flex items-center justify-between gap-2 text-sm">
                <span title={category.description}>{category.label}</span>
                <StarRatingInput
                  value={filters.minRatings[category.name] ?? 0}
                  onChange={(stars) => setMinRating(category.name, stars)}
                  aria-label={`Minimum ${category.label} rating`}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Minimum average rating. Click the selected star again to clear.
            </p>
          </AccordionContent>
        </AccordionItem>

        {FILTER_GROUPS.map((group) => (
          <Fragment key={group.id}>
            <AccordionItem value={group.id}>
              <AccordionTrigger>{group.label}</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                {group.facets.map((facet) =>
                  facet.control === 'toggle' ? (
                    <label
                      key={facet.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{facet.label}</span>
                      <Switch
                        checked={(filters.facets[facet.id]?.[0] ?? 'false') === 'true'}
                        onCheckedChange={(checked) => setToggle(facet.id, checked)}
                      />
                    </label>
                  ) : (
                    <div key={facet.id} className="flex flex-col gap-1.5">
                      <span className="text-sm">{facet.label}</span>
                      <div className="flex flex-col gap-1.5 pl-1">
                        {facet.options?.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Checkbox
                              checked={(filters.facets[facet.id] ?? []).includes(option.value)}
                              onCheckedChange={(checked) =>
                                toggleFacetValue(facet.id, option.value, checked === true)
                              }
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </AccordionContent>
            </AccordionItem>
            {group.id === 'connectivity-smart-charging' && (
              <AccordionItem value="protocols">
                <AccordionTrigger>Protocols</AccordionTrigger>
                <AccordionContent>
                  <ProtocolFilter
                    value={filters.protocols}
                    onChange={(protocols) => onChange({ ...filters, protocols })}
                  />
                </AccordionContent>
              </AccordionItem>
            )}
          </Fragment>
        ))}
      </Accordion>
    </div>
  )
}
