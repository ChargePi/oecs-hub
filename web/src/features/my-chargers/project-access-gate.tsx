import type { PropsWithChildren } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getUsage } from '@/lib/billing/client'

function LockedScreen() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
      <Lock className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-heading text-lg font-semibold">Projects need a paid plan</h2>
      <p className="text-sm text-muted-foreground">
        Upgrade your plan to organize chargers into named shortlists.
      </p>
      <Button asChild>
        <Link to="/profile?tab=billing">Upgrade plan</Link>
      </Button>
    </div>
  )
}

// UX-only mirror of the server-side gate (ProjectService rejects a free-tier caller with
// PermissionDenied regardless of this component - see internal/entitlement). Fails open
// (usage unknown/unreachable) so a legitimate paid user isn't locked out by a transient
// billing hiccup; they'd just see the real PermissionDenied from the API if they weren't
// actually entitled.
export function ProjectAccessGate({ children }: PropsWithChildren) {
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: getUsage,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (data?.tier === 'free') return <LockedScreen />

  return children
}
