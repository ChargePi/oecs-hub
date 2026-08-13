import type { ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { humanize } from '@/lib/oecs/format'
import { cn } from '@/lib/utils'

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

/** A wrapped group of pills for CSV-style array values, shared between the drawer and comparison table. */
export function badgeGroup(items?: string[]): ReactNode {
  if (!items || items.length === 0) return undefined
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary">
          {item}
        </Badge>
      ))}
    </div>
  )
}

/**
 * Like badgeGroup, but items not present in every compared variant (per `commonItems`) are
 * called out with a solid primary pill instead of the default muted one.
 */
export function diffBadgeGroup(
  items: string[],
  commonItems: Set<string>,
  humanizeItems?: boolean,
): ReactNode {
  if (items.length === 0) return undefined
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant={commonItems.has(item) ? 'secondary' : 'default'}>
          {humanizeItems ? humanize(item) : item}
        </Badge>
      ))}
    </div>
  )
}
