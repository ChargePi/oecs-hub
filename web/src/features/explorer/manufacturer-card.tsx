import { Link } from 'react-router'
import { Factory } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ManufacturerSummary } from '@/lib/registry/types'

export function ManufacturerCard({ manufacturer }: { manufacturer: ManufacturerSummary }) {
  return (
    <Link to={`/explore/${manufacturer.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader className="flex-row items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Factory className="size-5" />
          </div>
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
