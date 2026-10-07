import type { PropsWithChildren } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getUsage } from '@/lib/billing/client'

function LockedScreen({ reason }: { reason: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-4 px-6 py-12 text-center">
      <Lock className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-heading text-lg font-semibold">Chat is locked</h2>
      <p className="text-sm text-muted-foreground">{reason}</p>
      <Button asChild>
        <Link to="/profile?tab=billing">Upgrade plan</Link>
      </Button>
    </div>
  )
}

// Locks out free-tier accounts once they exhaust their included token allowance; paid
// accounts are never limited. Fails open (usage unknown/unreachable) rather than
// blocking a legitimate user over a transient hiccup.
export function ChatAccessGate({ children }: PropsWithChildren) {
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: getUsage,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-3 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (data?.tier === 'free') {
    const tokens = data.metrics.find((m) => m.code === 'tokens')
    if (tokens?.includedUnits !== undefined && tokens.consumedUnits >= tokens.includedUnits) {
      return (
        <LockedScreen reason="You've used up this month's free token allowance. Upgrade your plan to keep chatting." />
      )
    }
  }

  return children
}
