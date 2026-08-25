import { Zap } from 'lucide-react'

import { GithubIcon } from '@/components/icons/github-icon'
import { Separator } from '@/components/ui/separator'

const OECS_SPEC_URL = 'https://github.com/ChargePi/oecs'
const OECS_HUB_GITHUB_URL = 'https://github.com/ChargePi/oecs-hub'
const CHARGEPI_URL = 'https://github.com/ChargePi'

export function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <Separator className="mb-8" />
      <div className="flex flex-col items-center justify-between gap-6 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2 font-heading font-medium text-foreground">
          <Zap className="size-4 text-primary" aria-hidden="true" />
          OECS Hub
        </div>
        <p className="text-center">
          The open, vendor-neutral registry for EV charger specifications.
        </p>
        <a
          href={OECS_HUB_GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View on GitHub"
          className="flex size-11 items-center justify-center transition-colors hover:text-foreground"
        >
          <GithubIcon className="size-5" aria-hidden="true" />
        </a>
      </div>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center text-xs text-muted-foreground">
        <a
          href={OECS_SPEC_URL}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-foreground"
        >
          OECS spec
        </a>
        <span>
          Developed by{' '}
          <a
            href={CHARGEPI_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium transition-colors hover:text-foreground"
          >
            ChargePi
          </a>
        </span>
      </div>
    </footer>
  )
}
