import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'

import { Reveal } from '@/components/reveal'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/use-count-up'
import { SearchBar } from '@/components/search-bar'
import { registryClient } from '@/lib/registry/client'
import { HeroPreview } from './hero-preview'

function useRegistryStats() {
  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => registryClient.listManufacturers(),
  })
  if (!manufacturers) return undefined
  return {
    manufacturers: manufacturers.length,
    chargers: manufacturers.reduce((sum, m) => sum + m.variantCount, 0),
  }
}

function Stat({ value, label }: { value?: number; label: string }) {
  const shown = useCountUp(value)
  return (
    <div className="flex flex-col items-center gap-1 px-6">
      {shown == null ? (
        <Skeleton className="h-8 w-14" />
      ) : (
        <span className="font-mono text-2xl font-semibold tabular-nums">{shown.toLocaleString()}</span>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function HeroSection() {
  const stats = useRegistryStats()

  return (
    <section>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-12 md:px-6 md:pt-24 md:pb-16">
        <Reveal delay={0}>
          <h1 className="max-w-3xl text-center text-4xl font-semibold tracking-tighter text-balance md:text-6xl">
            Explore and compare EV chargers.{' '}
            <span className="text-muted-foreground">All in one place.</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-5 max-w-xl text-center text-pretty text-muted-foreground md:text-lg">
            The OECS Hub is a charger registry and comparator. Explore manufacturers, find chargers that suit your use
            case, and compare them to get the best one.
          </p>
        </Reveal>
        <Reveal delay={150} className="relative z-20 mt-8 flex w-full justify-center">
          <SearchBar size="hero" />
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10 grid grid-cols-3 gap-y-6 sm:flex sm:items-center sm:justify-center sm:divide-x sm:divide-border/60">
            <Stat value={stats?.manufacturers} label="Manufacturers" />
            <Stat value={stats?.chargers} label="Chargers" />
            <div className="flex flex-col items-center gap-1 px-6">
              <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Schema-validated</span>
            </div>
          </div>
        </Reveal>
        <Reveal delay={300} className="mt-16 w-full max-w-4xl">
          <HeroPreview />
        </Reveal>
      </div>
    </section>
  )
}
