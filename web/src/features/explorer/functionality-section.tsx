import { Link } from 'react-router'
import { GitCompare, Search, ShieldCheck, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal } from '@/components/reveal'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { cn } from '@/lib/utils'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

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
            Explore, compare, decide
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
                body="Explore manufacturers, product lines and charger variants. The comparator helps you decide."
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
                body="Compare chargers side by side on power, connectors, protocols and price to get the best fit for your needs."
              />
            </Link>
          </Reveal>
          <Reveal delay={200}>
            <StepCard
              icon={ShieldCheck}
              title="Decide"
              body="Every charger specification is validated against the OECS schema and reviewed before publishing, so the numbers you compare are ones you can trust."
            />
          </Reveal>

          <Reveal delay={300}>
            {CHAT_ENABLED ? (
              <button
                type="button"
                onClick={() => useChatDrawerStore.getState().setOpen(true)}
                className="block h-full w-full rounded-xl text-left transition-colors hover:bg-muted/40"
              >
                <StepCard
                  icon={Sparkles}
                  title="Ask the assistant"
                  body="Overwhelmed by the selection? Ask the assistant to help you find the best charger for your use case. Compare, discover and decide with confidence."
                />
              </button>
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
                  Ask the assistant to help you find the best charger for your use case. Coming
                  soon.
                </CardContent>
              </Card>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
