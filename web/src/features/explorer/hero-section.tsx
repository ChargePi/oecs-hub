import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'

export function HeroSection() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-8 md:px-6 md:pt-24">
      <Reveal delay={0}>
        <h1 className="max-w-2xl text-center text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Explore and compare EV chargers. All in one place.
        </h1>
      </Reveal>
      <Reveal delay={100}>
        <p className="mt-4 max-w-xl text-center text-muted-foreground">
          An OECS-backed charger registry. Explore manufacturers, find chargers that suit your use
          case, and compare them to get the best one.
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
