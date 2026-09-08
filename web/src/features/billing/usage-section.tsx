import { useQuery } from '@tanstack/react-query'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getUsage } from '@/lib/billing/client'

function formatUnits(value: number): string {
  return new Intl.NumberFormat().format(value)
}

export function UsageSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: getUsage,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  // Not provisioned yet, or Lago is unreachable - degrade to an empty state rather than
  // crashing the page.
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Usage information isn't available right now. If you just signed up, check back
          shortly.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{data.planName}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Current billing period: {new Date(data.periodStart).toLocaleDateString()} –{' '}
          {new Date(data.periodEnd).toLocaleDateString()}
        </CardContent>
      </Card>

      {data.metrics.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No usage recorded yet this period.
          </CardContent>
        </Card>
      ) : (
        data.metrics.map((metric) => (
          <Card key={metric.code}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatUnits(metric.consumedUnits)}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
