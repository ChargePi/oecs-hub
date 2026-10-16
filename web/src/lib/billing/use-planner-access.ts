import { useQuery } from '@tanstack/react-query'

import { getUsage } from './client'
import { BILLING_ENABLED } from './config'

export const PLANNER_ADDON_KEY = 'planning_agent'

// Paid plans include the planner; the planner subscription adds it to any plan.
export function usePlannerAccess(signedIn: boolean): boolean {
  const usage = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: getUsage,
    enabled: signedIn && BILLING_ENABLED,
    staleTime: 60_000,
    retry: false,
  })

  if (!signedIn) return false
  if (!BILLING_ENABLED) return true

  const data = usage.data
  return !!data && (data.tier === 'paid' || data.addons.some((a) => a.key === PLANNER_ADDON_KEY))
}
