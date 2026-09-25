import { useQuery } from '@tanstack/react-query'

import { getSupportChatIdentity } from './client'

export function useSupportChatIdentity(identityId: string | undefined) {
  return useQuery({
    queryKey: ['support-chat', 'identity', identityId],
    queryFn: getSupportChatIdentity,
    enabled: !!identityId,
    staleTime: Infinity,
    retry: 1,
  })
}
