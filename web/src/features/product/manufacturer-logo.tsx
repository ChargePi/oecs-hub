import { useState } from 'react'

import { cn } from '@/lib/utils'

/** Renders a manufacturer's OECS `manufacturer.logoUrl` inside the neutral badge used across
 *  the graph/explorer, falling back to a monogram of `name`'s initials when the manufacturer
 *  has no logo or the image fails to load, so placeholder badges stay distinguishable. Size the
 *  monogram with a text-* class in `className`. */
export function ManufacturerLogo({
  logoUrl,
  name,
  className,
}: {
  logoUrl?: string
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showLogo = !!logoUrl && !failed

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground',
        className,
      )}
    >
      {showLogo ? (
        <img
          src={logoUrl}
          alt=""
          className="size-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-semibold tracking-tight select-none" aria-hidden="true">
          {initials(name)}
        </span>
      )}
    </div>
  )
}

/** First letters of the first two words ("Wallbox Chargers" -> "WC"); a single word gives
 *  its first letter ("Zaptec" -> "Z"), except short all-caps acronyms which stay whole ("ABB"). */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) {
    const word = words[0]
    return word.length <= 3 && word === word.toUpperCase() ? word : word[0].toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}
