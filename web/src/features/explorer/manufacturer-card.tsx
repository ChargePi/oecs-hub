import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ManufacturerSummary } from '@/lib/registry/types'
import { cn } from '@/lib/utils'
import { ManufacturerLogo } from '@/features/product/manufacturer-logo'

export function ManufacturerCard({ manufacturer }: { manufacturer: ManufacturerSummary }) {
  const empty = manufacturer.productCount === 0

  return (
    <Link to={`/chargers/${manufacturer.id}`} className="group/link">
      <Card className="h-full transition-colors group-hover/link:bg-muted/40 group-hover/link:ring-primary/40">
        <CardHeader className="flex items-center gap-4">
          <ManufacturerLogo
            logoUrl={manufacturer.logoUrl}
            className="size-14 rounded-xl"
            iconClassName="size-7"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <CardTitle className="line-clamp-2 text-lg break-words" title={manufacturer.name}>
              {manufacturer.name}
            </CardTitle>
            {manufacturer.country && (
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {manufacturer.country}
              </p>
            )}
          </div>
          <ChevronRight
            className="size-5 shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent
          className={cn(
            'mt-auto text-center text-sm text-muted-foreground',
            empty && 'italic opacity-60',
          )}
        >
          {empty ? (
            'No products yet'
          ) : (
            <>
              {manufacturer.productCount} product line{manufacturer.productCount === 1 ? '' : 's'} ·{' '}
              {manufacturer.variantCount} variant{manufacturer.variantCount === 1 ? '' : 's'}
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
