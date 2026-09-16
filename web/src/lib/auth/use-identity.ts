import { useSession } from './use-session'
import type { AccountType, Traits } from './types'

/** Builds a /auth/login path that returns to (pathname + search) after a successful login. */
export function loginRedirect(pathname: string, search: string): string {
  const returnTo = encodeURIComponent(pathname + search)
  return `/auth/login?return_to=${returnTo}`
}

/** Hard-navigates to login when an action fails because the session is no longer
 *  valid - a full reload, not client-side navigation, so it also clears any
 *  in-memory state tied to the dead session (same precedent as useLogout). */
export function redirectToLogin(): void {
  window.location.assign(loginRedirect(window.location.pathname, window.location.search))
}

export interface Identity {
  id: string
  email: string
  name?: string
  userType: AccountType
  companyName?: string
}

// Thin projection of useSession() for call sites that only care about "am I logged in,
// and as what" - not the full Kratos Session shape (AAL, authenticated_at, devices, ...).
export function useIdentity(): { identity: Identity | null; isLoading: boolean } {
  const { data: session, isLoading } = useSession()

  if (!session?.identity) return { identity: null, isLoading }

  const traits = session.identity.traits as Traits

  return {
    identity: {
      id: session.identity.id,
      email: traits.email,
      name: traits.name,
      // schema_id, not a trait - see AccountType's own comment in ./types.
      userType: session.identity.schema_id as AccountType,
      companyName: 'company' in traits ? traits.company.name : undefined,
    },
    isLoading,
  }
}
