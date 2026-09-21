import { Skeleton } from '@/components/ui/skeleton'
import { canSubmitSpecs } from '@/lib/auth/account-type'
import { useIdentity } from '@/lib/auth/use-identity'
import { ManufacturerChargersPage } from '@/features/manufacturer/manufacturer-chargers-page'
import { IndividualChargersPage } from './individual-chargers-page'

/**
 * The route every account type lands on - RequireAuth already guarantees a session by the
 * time this renders, so the only branch left is which segment set to show: manufacturers manage their submissions, everyone else (individual and
 * business) gets favorites, projects and ratings.
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

  return canSubmitSpecs(identity.userType) ? (
    <ManufacturerChargersPage />
  ) : (
    <IndividualChargersPage />
  )
}
