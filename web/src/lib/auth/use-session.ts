import { useQuery } from '@tanstack/react-query'
import { ResponseError, type Session } from '@ory/client-fetch'

import { frontendApi } from './client'

// Kratos owns the session (httpOnly cookie) - this is a cache of it, not a source of
// truth, so it isn't persisted in zustand the way comparison-store.ts persists its state.
// A 401 (no session) is a normal, expected outcome, not a fetch failure - resolves to
// null rather than rejecting, so it never hits the retry logic below at all.
//
// Everything else (network blip, proxy hiccup, Kratos briefly unreachable) does throw and
// gets react-query's default retry - without it, a single transient failure would leave
// this query in a permanent error state indistinguishable from "logged out" to useIdentity,
// which would send a still-logged-in user through RequireAuth's redirect straight into
// Kratos's own "A valid session was detected" rejection.
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
  })
}
