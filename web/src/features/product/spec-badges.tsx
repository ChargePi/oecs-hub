import type { ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { humanize } from '@/lib/oecs/format'
import { cn } from '@/lib/utils'
import { ValueTooltip, type SpecListItem } from '@/features/product/spec-section'

/** Pill-style Yes/No value, shared between the product detail drawer and the comparison table. */
export function boolBadge(value?: boolean): ReactNode {
  if (value == null) return undefined
  return (
    <Badge
      variant="outline"
      className={cn('gap-1', value ? 'text-success' : 'text-muted-foreground')}
    >
      {value ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

/** A wrapped group of pills for CSV-style array values, shared between the drawer and comparison
 *  table. `describe` is looked up against the raw (pre-humanize) item, same as `diffBadgeGroup`. */
export function badgeGroup(
  items?: string[],
  humanizeItems?: boolean,
  describe?: (item: string) => string | undefined,
): ReactNode {
  if (!items || items.length === 0) return undefined
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <ValueTooltip key={item} description={describe?.(item)}>
          <Badge variant="secondary">{humanizeItems ? humanize(item) : item}</Badge>
        </ValueTooltip>
      ))}
    </div>
  )
}

/**
 * Like badgeGroup, but items not present in every compared variant (per `commonTexts`, matched
 * on `item.text`) are called out with a solid primary pill instead of the default muted one.
 */
export function diffBadgeGroup(items: SpecListItem[], commonTexts: Set<string>): ReactNode {
  if (items.length === 0) return undefined
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <ValueTooltip key={item.text} description={item.description}>
          <Badge variant={commonTexts.has(item.text) ? 'secondary' : 'default'}>{item.text}</Badge>
        </ValueTooltip>
      ))}
    </div>
  )
}
