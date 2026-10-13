import { useQuery } from '@tanstack/react-query'

import { getUsage } from '@/lib/billing/client'
import { useChatStreamStore } from '@/stores/chat-stream-store'

export const LOCKED_PLACEHOLDER = 'Token allowance used up'

// UX-only mirror of the server-side gate, which rejects a send once the plan's token
// allowance is used up. Fails open (usage unknown/unreachable) rather than locking a
// legitimate user out over a transient hiccup.
export function useChatQuota(): { exhausted: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: getUsage,
    retry: false,
  })
  const rejected = useChatStreamStore((s) => s.quotaExceeded)

  if (data?.tier === 'paid') return { exhausted: false, isLoading }

  const tokens = data?.metrics.find((m) => m.code === 'tokens')
  const usedUp =
    data?.tier === 'free' &&
    tokens?.includedUnits !== undefined &&
    tokens.consumedUnits >= tokens.includedUnits

  return { exhausted: usedUp || rejected, isLoading }
}
