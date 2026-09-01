import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

// Standard Kratos SPA flow-fetch pattern: a `?flow=<id>` in the URL means Kratos already
// started this flow (e.g. redirected back here after a social-login trait-completion
// step) - fetch it by id. Otherwise this is a fresh visit - initiate a new browser flow.
//
// recreateOn: extra values that should re-trigger `create` (never `get` - a flow already
// started keeps whatever it started with). Every caller except RegisterPage passes none,
// since login/recovery/verification/settings flows take no such per-render parameter.
// RegisterPage passes [accountType]: a registration flow is schema-scoped
// (identitySchema, chosen by AccountTypeSelector), so picking a different account type
// must create a new flow against the new schema, not just re-render the existing one.
export function useFlow<T>(
  create: () => Promise<T>,
  get: (id: string) => Promise<T>,
  recreateOn: unknown[] = [],
) {
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
    // singleton client) - only flowId and recreateOn's values should re-trigger the
    // fetch. recreateOn is fixed-length per call site (each caller always passes the
    // same number of values), so its spread here doesn't violate the rules of hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, ...recreateOn])

  if (state.flowId !== flowId) return { flow: null, error: false }

  return { flow: state.flow, error: state.error }
}
