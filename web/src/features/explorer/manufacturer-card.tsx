import { Link } from 'react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ManufacturerSummary } from '@/lib/registry/types'
import { ManufacturerLogo } from '@/features/product/manufacturer-logo'

export function ManufacturerCard({ manufacturer }: { manufacturer: ManufacturerSummary }) {
  return (
    <Link to={`/chargers/${manufacturer.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader className="flex-row items-center gap-3">
          <ManufacturerLogo
            logoUrl={manufacturer.logoUrl}
            className="size-10"
            iconClassName="size-5"
          />
          <div className="min-w-0">
            <CardTitle className="truncate">{manufacturer.name}</CardTitle>
            {manufacturer.country && (
              <p className="text-xs text-muted-foreground">{manufacturer.country}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {manufacturer.productCount} product line{manufacturer.productCount === 1 ? '' : 's'} ·{' '}
          {manufacturer.variantCount} variant{manufacturer.variantCount === 1 ? '' : 's'}
        </CardContent>
      </Card>
    </Link>
  )
}
