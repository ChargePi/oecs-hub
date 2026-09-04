import { Building2, Plug, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal } from '@/components/reveal'

const AUDIENCE_SEGMENTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Plug,
    title: 'Infrastructure developers, installers & integrators',
    body: "Real electrical, connector and mounting specs for every manufacturer, side by side. Explore the field, compare what matters, and land on the charger that actually fits your site's physical, functional and regulatory constraints.",
  },
  {
    icon: User,
    title: 'EV drivers & residents',
    body: 'Charging at home or just curious what that charger at your building actually supports? Look up any charger by model and see its specs in plain language — no datasheet required.',
  },
  {
    icon: Building2,
    title: 'Real estate & property teams',
    body: 'Evaluating chargers for a property, portfolio or new development? Compare options side by side on the specs that matter for procurement — power, connector standards, and compliance — without vendor spin.',
  },
]

export function AudienceSection() {
  return (
    <section className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight">Who OECS Hub is for</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            Whether you're speccing a project, charging at home, or evaluating a building, OECS Hub
            gives you one place to find the answer.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCE_SEGMENTS.map((segment, i) => (
            <Reveal key={segment.title} delay={i * 100}>
              <Card className="h-full">
                <CardHeader className="flex-row items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <segment.icon className="size-5" />
                  </div>
                  <CardTitle>{segment.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{segment.body}</CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
