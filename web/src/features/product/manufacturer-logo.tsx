import { useState } from 'react'
import { Factory } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Renders a manufacturer's OECS `manufacturer.logoUrl` inside the same colored icon badge
 *  used across the graph/explorer, falling back to a generic factory icon when the
 *  manufacturer has no logo or the image fails to load. */
export function ManufacturerLogo({
  logoUrl,
  className,
  iconClassName,
}: {
  logoUrl?: string
  className?: string
  iconClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const showLogo = !!logoUrl && !failed

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15 text-primary',
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
        <Factory className={iconClassName} aria-hidden="true" />
      )}
    </div>
  )
}
