import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/lib/auth/use-identity'
import { ManufacturerChargersPage } from '@/features/manufacturer/manufacturer-chargers-page'
import { IndividualChargersPage } from './individual-chargers-page'

/**
 * The route both account types land on - RequireAuth already guarantees a session by the
 * time this renders, so the only branch left is which segment set to show.
 */
export function MyChargersPage() {
  const { identity, isLoading } = useIdentity()

  if (isLoading || !identity) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-10 md:px-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return identity.userType === 'manufacturer' ? (
    <ManufacturerChargersPage />
  ) : (
    <IndividualChargersPage />
  )
}
