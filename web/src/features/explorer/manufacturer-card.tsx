import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { countryName } from '@/lib/oecs/format'
import type { ManufacturerSummary } from '@/lib/registry/types'
import { cn } from '@/lib/utils'
import { ManufacturerLogo } from '@/features/product/manufacturer-logo'

export function ManufacturerCard({ manufacturer }: { manufacturer: ManufacturerSummary }) {
  const empty = manufacturer.productCount === 0
  const country = countryName(manufacturer.country)

  return (
    <Link to={`/chargers/${manufacturer.id}`} className="group/link">
      <Card
        className={cn(
          'h-full transition-all group-hover/link:bg-muted/40 group-hover/link:ring-primary/40',
          empty && 'opacity-70 group-hover/link:opacity-100',
        )}
      >
        <CardHeader className="flex items-center gap-4">
          <ManufacturerLogo
            logoUrl={manufacturer.logoUrl}
            name={manufacturer.name}
            className="size-12 rounded-xl bg-muted text-base text-foreground"
            iconClassName="size-6"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle className="line-clamp-2 text-base break-words" title={manufacturer.name}>
              {manufacturer.name}
            </CardTitle>
            {country && <p className="text-xs text-muted-foreground">{country}</p>}
            <p className={cn('text-xs text-muted-foreground', empty && 'italic')}>
              {empty ? (
                'No products yet'
              ) : (
                <>
                  {manufacturer.productCount} product line
                  {manufacturer.productCount === 1 ? '' : 's'} · {manufacturer.variantCount} variant
                  {manufacturer.variantCount === 1 ? '' : 's'}
                </>
              )}
            </p>
          </div>
          <ChevronRight
            className="size-5 shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100"
            aria-hidden="true"
          />
        </CardHeader>
      </Card>
    </Link>
  )
}
