import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Factory, Layers, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { registryClient } from '@/lib/registry/client'
import { cn } from '@/lib/utils'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MIN_CHARGERS_FOR_COUNT = 10

type SearchBarProps = {
  size?: 'default' | 'hero'
  className?: string
}

export function SearchBar({ size = 'default', className }: SearchBarProps) {
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
  })
  const chargerCount = manufacturers.reduce((sum, m) => sum + m.variantCount, 0)
  const placeholder =
    chargerCount >= MIN_CHARGERS_FOR_COUNT
      ? `Search manufacturers or ${chargerCount.toLocaleString()} chargers…`
      : 'Search manufacturers or chargers…'

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const hero = size === 'hero'
  const hasQuery = query.trim().length > 0
  const showResults = isFocused && hasQuery
  const showBrowse = isFocused && !hasQuery
  const panelClass = cn(
    'absolute top-full z-20 w-full overflow-hidden border border-t-0 border-ring bg-card text-left shadow-xl shadow-black/40',
    'before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-border/60',
    hero ? 'rounded-b-xl' : 'rounded-b-lg',
  )

  function goToManufacturer(manufacturerId: string) {
    setIsFocused(false)
    inputRef.current?.blur()
    navigate(`/chargers/${manufacturerId}`)
  }

  function searchChargers() {
    if (!hasQuery) return
    inputRef.current?.blur()
    navigate(`/chargers?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className={cn('relative w-full', hero ? 'max-w-xl' : 'max-w-md', className)}>
      <div className="relative">
        <Search
          className={cn(
            'pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-muted-foreground',
            hero ? 'left-4 size-5' : 'left-3 size-4',
          )}
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') searchChargers()
            if (e.key === 'Escape') inputRef.current?.blur()
          }}
          placeholder={placeholder}
          className={cn(
            hero
              ? 'h-14 rounded-xl bg-card/80 pr-20 pl-12 text-base shadow-2xl shadow-black/40 backdrop-blur md:text-base'
              : 'h-9 pr-16 pl-9 text-sm',
            isFocused &&
              'rounded-b-none bg-card focus-visible:border-b-transparent focus-visible:ring-0 dark:bg-card',
          )}
        />
        <kbd
          className={cn(
            'pointer-events-none absolute top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted font-mono text-muted-foreground sm:block',
            hero ? 'right-4 px-2 py-0.5 text-xs' : 'right-2 px-1.5 text-[10px]',
          )}
        >
          {IS_MAC ? '⌘K' : 'Ctrl K'}
        </kbd>
      </div>

      {showBrowse && (
        <div className={panelClass}>
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
        <div className={panelClass}>
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
