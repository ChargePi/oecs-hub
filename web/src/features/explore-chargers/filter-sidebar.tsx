import { useMemo, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { countryFlag } from '@/lib/oecs/format'
import { registryClient } from '@/lib/registry/client'
import { FILTER_GROUPS } from './filter-manifest'
import type { FilterState } from './filter-state'

const MAX_POWER_KW = 400

export function FilterSidebar({
  filters,
  onChange,
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => registryClient.listManufacturers(),
  })

  const countries = useMemo(() => {
    const set = new Set<string>()
    for (const m of manufacturers ?? []) if (m.country) set.add(m.country)
    return [...set].sort()
  }, [manufacturers])

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

  function toggleCountry(country: string, checked: boolean) {
    const next = checked
      ? [...filters.countries, country]
      : filters.countries.filter((c) => c !== country)
    onChange({ ...filters, countries: next })
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

      <Accordion type="multiple" className="flex flex-col gap-1">
        <AccordionItem value="country">
          <AccordionTrigger>Country</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2">
            {countries.map((country) => (
              <label
                key={country}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Checkbox
                  checked={filters.countries.includes(country)}
                  onCheckedChange={(checked) => toggleCountry(country, checked === true)}
                />
                {countryFlag(country)} {country}
              </label>
            ))}
            {countries.length === 0 && (
              <p className="text-xs text-muted-foreground">No manufacturers loaded yet.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {FILTER_GROUPS.map((group) => (
          <AccordionItem key={group.id} value={group.id}>
            <AccordionTrigger>{group.label}</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3">
              {group.facets.map((facet) =>
                facet.control === 'toggle' ? (
                  <label key={facet.id} className="flex items-center justify-between gap-2 text-sm">
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
        ))}
      </Accordion>
    </div>
  )
}
