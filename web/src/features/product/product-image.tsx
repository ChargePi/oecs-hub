import { useState } from 'react'
import { CircleHelp } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Renders a charger's OECS `model.productImageUrl`, falling back to a question-mark
 *  placeholder when the model has no image or the image fails to load. */
export function ProductImage({
  src,
  alt,
  className,
}: {
  src?: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = !!src && !failed

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <CircleHelp className="size-1/2 text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  )
}
