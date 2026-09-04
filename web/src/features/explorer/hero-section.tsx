import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'

export function HeroSection() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-8 md:px-6 md:pt-24">
      <Reveal delay={0}>
        <h1 className="max-w-2xl text-center text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Explore EV charger manufacturers, products & variants
        </h1>
      </Reveal>
      <Reveal delay={100}>
        <p className="mt-4 max-w-xl text-center text-muted-foreground">
          The open registry for EV charger specifications — search a brand or product line, browse it
          as a graph, and compare the ones you care about on the specs that matter.
        </p>
      </Reveal>
      <Reveal delay={200}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="#manufacturers">Browse manufacturers</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/compare">Compare chargers</Link>
          </Button>
        </div>
      </Reveal>
    </div>
  )
}
