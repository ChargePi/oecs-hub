import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

// Standard Kratos SPA flow-fetch pattern: a `?flow=<id>` in the URL means Kratos already
// started this flow (e.g. redirected back here after a social-login trait-completion
// step) - fetch it by id. Otherwise this is a fresh visit - initiate a new browser flow.
export function useFlow<T>(create: () => Promise<T>, get: (id: string) => Promise<T>) {
  const [searchParams] = useSearchParams()
  const flowId = searchParams.get('flow')
  // Keyed by flowId so a change in flowId can never show a stale flow/error from a
  // previous id - only ever set from the effect's async callbacks below, never
  // synchronously in the effect body (that would trigger a cascading extra render).
  const [state, setState] = useState<{ flowId: string | null; flow: T | null; error: boolean }>({
    flowId,
    flow: null,
    error: false,
  })

  useEffect(() => {
    let cancelled = false

    const promise = flowId ? get(flowId) : create()

    promise
      .then((f) => {
        if (!cancelled) setState({ flowId, flow: f, error: false })
      })
      .catch(() => {
        if (!cancelled) setState({ flowId, flow: null, error: true })
      })

    return () => {
      cancelled = true
    }
    // create/get are re-created every render at the call site (bound to a stable
    // singleton client) - only flowId should re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId])

  if (state.flowId !== flowId) return { flow: null, error: false }

  return { flow: state.flow, error: state.error }
}
