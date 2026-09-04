import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

export function StarRatingInput({
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className={cn(
            'rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-amber-500 disabled:pointer-events-none disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          )}
        >
          <Star className={cn('size-5', star <= value && 'fill-current text-amber-500')} />
        </button>
      ))}
    </div>
  )
}
