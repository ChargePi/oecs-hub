import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { frontendApi } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'

const GENERIC_MESSAGE = "We couldn't process your authentication request. Please try again."

// Never surface Kratos's raw reason/message text to the client - it can leak internal
// detail (provider names, identifiers, stack-ish wording). Classify into a small set of
// known, user-safe cases instead and fall back to a generic message for everything else.
function classify(rawError: object | undefined): string {
  const text = JSON.stringify(rawError ?? {}).toLowerCase()
  if (text.includes('already exist') || text.includes('duplicate')) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  return GENERIC_MESSAGE
}

// Landed on out-of-band, not inline in a flow's own form - e.g. Kratos rejects an OIDC
// callback (state mismatch, an account already linked to a different method) before any
// flow UI exists to show the error in. See oryClientConfiguration's error_ui_url.
export function AuthErrorPage() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    frontendApi
      .getFlowError({ id })
      .then((flowError) => {
        if (!cancelled) setMessage(classify(flowError.error))
      })
      .catch(() => {
        if (!cancelled) setMessage(GENERIC_MESSAGE)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="m-auto flex w-full max-w-md flex-col gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{id ? (message ?? 'Loading…') : GENERIC_MESSAGE}</p>
      <Button asChild size="lg" className="self-center">
        <Link to="/auth/login">Back to login</Link>
      </Button>
    </div>
  )
}
