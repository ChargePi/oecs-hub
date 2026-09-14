import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { frontendApi } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'

// Landed on out-of-band, not inline in a flow's own form - e.g. Kratos rejects an OIDC
// callback (state mismatch, an account already linked to a different method) before any
// flow UI exists to show the error in. See oryClientConfiguration's error_ui_url.
export function AuthErrorPage() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    frontendApi
      .getFlowError({ id })
      .then((flowError) => {
        if (cancelled) return
        const err = flowError.error as { reason?: string; message?: string } | undefined
        setMessage(err?.reason ?? err?.message ?? null)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {!id || failed
          ? 'Something went wrong and we could not load more details.'
          : (message ?? 'Loading details…')}
      </p>
      <Button asChild size="lg" className="self-center">
        <Link to="/auth/login">Back to login</Link>
      </Button>
    </div>
  )
}
