import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

// Standard Kratos SPA flow-fetch pattern: a `?flow=<id>` in the URL means Kratos already
// started this flow (e.g. redirected back here after a social-login trait-completion
// step) - fetch it by id. Otherwise this is a fresh visit - initiate a new browser flow.
//
// recreateOn: extra values that should re-trigger `create` (never `get` - a flow already
// started keeps whatever it started with). Every caller except RegisterPage passes none,
// since login/recovery/verification/settings flows take no such per-render parameter.
// RegisterPage passes [accountType]: a registration flow is schema-scoped, so picking a
// different account type must create a new flow against the new schema.
//
// enabled: false skips the fetch entirely, so RegisterPage's picker step doesn't create
// a flow before the user has chosen a type.
export function useFlow<T>(
  create: () => Promise<T>,
  get: (id: string) => Promise<T>,
  recreateOn: unknown[] = [],
  enabled = true,
  // Explicit override for the URL's `?flow=`, incl. `null` to ignore it outright. Used by
  // RegisterPage: a `?flow=` that doesn't match its own resume check belongs to an
  // unrelated flow (e.g. Kratos's generic sign-up link) and must not be fetched here -
  // `undefined` (the default) means "trust the URL", as every other caller wants.
  flowIdOverride?: string | null,
) {
  const [searchParams] = useSearchParams()
  const flowId = flowIdOverride !== undefined ? flowIdOverride : searchParams.get('flow')
  // Keyed by flowId so a change in flowId can never show a stale flow/error from a
  // previous id - only ever set from the effect's async callbacks below, never
  // synchronously in the effect body (that would trigger a cascading extra render).
  const [state, setState] = useState<{ flowId: string | null; flow: T | null; error: boolean }>({
    flowId,
    flow: null,
    error: false,
  })

  useEffect(() => {
    if (!enabled) return

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
    // create/get are re-created every render (bound to a stable singleton client) - only
    // flowId, enabled, and recreateOn should re-trigger the fetch. recreateOn is
    // fixed-length per call site, so spreading it here doesn't violate rules of hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, enabled, ...recreateOn])

  if (!enabled) return { flow: null, error: false }

  if (state.flowId !== flowId) return { flow: null, error: false }

  return { flow: state.flow, error: state.error }
}
