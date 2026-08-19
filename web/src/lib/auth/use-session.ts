import { useQuery } from '@tanstack/react-query'
import { ResponseError, type Session } from '@ory/client-fetch'

import { frontendApi } from './client'

// Kratos owns the session (httpOnly cookie) - this is a cache of it, not a source of
// truth, so it isn't persisted in zustand the way comparison-store.ts persists its state.
// A 401 (no session) is a normal, expected outcome, not a fetch failure - resolves to
// null rather than rejecting, and isn't retried.
export function useSession() {
  return useQuery<Session | null>({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      try {
        return await frontendApi.toSession()
      } catch (err) {
        if (err instanceof ResponseError && err.response.status === 401) return null
        throw err
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}
