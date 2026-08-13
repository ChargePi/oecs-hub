import { useQuery } from '@tanstack/react-query'

import { Skeleton } from '@/components/ui/skeleton'
import { registryClient } from '@/lib/registry/client'
import { ManufacturerCard } from './manufacturer-card'

export function ExplorerPage() {
  const { data: manufacturers = [], isLoading } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => registryClient.listManufacturers(),
  })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16 md:px-6 md:py-24">
      <h1 className="max-w-2xl text-center text-4xl font-semibold tracking-tight text-balance md:text-5xl">
        Explore EV charger manufacturers, products & variants
      </h1>
      <p className="mt-4 max-w-xl text-center text-muted-foreground">
        Search a brand or product line, then browse it as a graph — manufacturer down to product and
        variant — before comparing the ones you care about.
      </p>

      <div className="mt-16 w-full">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Browse manufacturers</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {manufacturers.map((manufacturer) => (
              <ManufacturerCard key={manufacturer.id} manufacturer={manufacturer} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
