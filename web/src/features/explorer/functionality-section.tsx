import { Link } from 'react-router'
import { GitCompare, Search, ShieldCheck, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal } from '@/components/reveal'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { cn } from '@/lib/utils'

function StepCard({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon: typeof Search
  title: string
  body: string
  className?: string
}) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
    </Card>
  )
}

export function FunctionalitySection() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Browse, compare, decide
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            Three steps to a charger decision you can defend.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0}>
            <a
              href="#manufacturers"
              className="block h-full transition-colors hover:bg-muted/40 rounded-xl"
            >
              <StepCard
                icon={Search}
                title="Browse"
                body="Explore every manufacturer, product line and variant in the registry as a searchable, browsable graph."
              />
            </a>
          </Reveal>
          <Reveal delay={100}>
            <Link
              to="/compare"
              className="block h-full transition-colors hover:bg-muted/40 rounded-xl"
            >
              <StepCard
                icon={GitCompare}
                title="Compare"
                body="Shortlist chargers side by side on power, connectors, protocols and price — the same view manufacturers see when reviewing submissions."
              />
            </Link>
          </Reveal>
          <Reveal delay={200}>
            <StepCard
              icon={ShieldCheck}
              title="Decide"
              body="Every spec is validated against the open OECS schema and reviewed before publishing, so the numbers you compare are ones you can trust."
            />
          </Reveal>

          <Reveal delay={300}>
            {CHAT_ENABLED ? (
              <Link
                to="/chat"
                className="block h-full transition-colors hover:bg-muted/40 rounded-xl"
              >
                <StepCard
                  icon={Sparkles}
                  title="Ask the assistant"
                  body="Describe what you need — power level, connector, budget — and get a shortlist back."
                />
              </Link>
            ) : (
              <Card className="h-full border-dashed border-border/60 bg-transparent opacity-80">
                <CardHeader className="flex-row items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Sparkles className="size-5" />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <CardTitle>Ask the assistant</CardTitle>
                    <Badge variant="secondary">Coming soon</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Describe what you need — power level, connector, budget — and get a shortlist
                  back. Coming soon.
                </CardContent>
              </Card>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
