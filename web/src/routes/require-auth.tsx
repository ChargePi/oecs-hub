import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router'

import { loginRedirect, useIdentity } from '@/lib/auth/use-identity'
import { Skeleton } from '@/components/ui/skeleton'

function GuardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-16">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { identity, isLoading } = useIdentity()
  const location = useLocation()

  if (isLoading) return <GuardSkeleton />
  if (!identity) return <Navigate to={loginRedirect(location.pathname, location.search)} replace />

  return children
}

export function RequireManufacturer({ children }: PropsWithChildren) {
  const { identity, isLoading } = useIdentity()
  const location = useLocation()

  if (isLoading) return <GuardSkeleton />
  if (!identity) return <Navigate to={loginRedirect(location.pathname, location.search)} replace />

  if (identity.userType !== 'manufacturer') {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-sm text-muted-foreground">
        This page is only available to manufacturer accounts.
      </div>
    )
  }

  return children
}
