import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Factory, Layers, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { registryClient } from '@/lib/registry/client'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const debouncedQuery = useDebouncedValue(query)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: results = [] } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => registryClient.searchCatalog(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  })

  const { data: manufacturers = [] } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => registryClient.listManufacturers(),
    enabled: isFocused,
  })

  const hasQuery = query.trim().length > 0
  const showResults = isFocused && hasQuery
  const showBrowse = isFocused && !hasQuery

  function goToManufacturer(manufacturerId: string) {
    setIsFocused(false)
    inputRef.current?.blur()
    navigate(`/explore/${manufacturerId}`)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search brands or products…"
          className="h-9 pl-9 text-sm"
        />
      </div>

      {showBrowse && (
        <div className="absolute top-full z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {manufacturers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No manufacturers yet.</p>
          ) : (
            <>
              <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                Browse manufacturers
              </p>
              <ul className="max-h-80 overflow-y-auto py-1">
                {manufacturers.map((manufacturer) => (
                  <li key={manufacturer.id}>
                    <button
                      onClick={() => goToManufacturer(manufacturer.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <Factory className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{manufacturer.name}</span>
                      {manufacturer.country && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {manufacturer.country}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {showResults && (
        <div className="absolute top-full z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No matches for "{query}"</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.type}-${result.manufacturerId}-${result.productId ?? ''}`}>
                  <button
                    onClick={() => goToManufacturer(result.manufacturerId)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {result.type === 'manufacturer' ? (
                      <Factory className="size-4 shrink-0 text-primary" />
                    ) : (
                      <Layers className="size-4 shrink-0 text-primary" />
                    )}
                    <span>
                      {result.label}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {result.type === 'manufacturer' ? 'Manufacturer' : 'Product line'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
