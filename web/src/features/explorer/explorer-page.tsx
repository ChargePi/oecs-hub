import { useQuery } from '@tanstack/react-query'

import { Footer } from '@/components/layout/footer'
import { Skeleton } from '@/components/ui/skeleton'
import { registryClient } from '@/lib/registry/client'
import { AudienceSection } from './audience-section'
import { FunctionalitySection } from './functionality-section'
import { HeroSection } from './hero-section'
import { ManufacturerCard } from './manufacturer-card'

export function ExplorerPage() {
  const { data: manufacturers = [], isLoading } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => registryClient.listManufacturers(),
  })

  return (
    <>
      <HeroSection />
      <AudienceSection />
      <FunctionalitySection />

      <div className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
          <h2
            id="manufacturers"
            className="mb-10 text-center text-2xl font-semibold tracking-tight"
          >
            Browse manufacturers
          </h2>
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

      <Footer />
    </>
  )
}
