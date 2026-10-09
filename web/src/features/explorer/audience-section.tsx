import type {LucideIcon} from 'lucide-react'
import {Building2, Plug, User} from 'lucide-react'

import {Reveal} from '@/components/reveal'
import {FeatureCard} from './feature-card'

type AudienceSegment = {
  icon: LucideIcon
  title: string
  body: string
  link: { to: string; label: string }
}

const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  {
    icon: Plug,
    title: 'Installers & integrators',
    body: 'Electrical and mounting specs alongside OCPP, ISO 15118, smart charging and payment support — side by side, so the charger you pick fits both your site and your backend.',
    link: { to: '/chargers?protocol=OCPP', label: 'Explore OCPP chargers' },
  },
  {
    icon: User,
    title: 'EV drivers & residents',
    body: 'Searching for the perfect home charger, or just curious what the one at your building can do? Look up any model and see its features in plain language — no datasheet required.',
    link: { to: '/chargers?charger-type=AC&form-factor=wall-mounted', label: 'Browse home chargers' },
  },
  {
    icon: Building2,
    title: 'Real estate & property teams',
    body: 'Compare chargers for a property or portfolio on power, connector standards and compliance — without vendor spin.',
    link: { to: '/compare', label: 'Start a comparison' },
  },
]

export function AudienceSection() {
  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-20 md:px-6 md:pt-16 md:pb-28">
        <Reveal className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tighter text-balance md:text-5xl">
            Built for everyone.
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Whether you're planning a new commercial or residential charging infrastructure project or simply charging
            at home, OECS Hub helps you find the best charger for your use case.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {AUDIENCE_SEGMENTS.map((segment, i) => (
            <Reveal key={segment.title} delay={i * 100}>
              <FeatureCard icon={segment.icon} title={segment.title} body={segment.body} link={segment.link}/>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
