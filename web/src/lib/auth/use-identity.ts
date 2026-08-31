import { useSession } from './use-session'
import type { Traits } from './types'

export interface Identity {
  id: string
  email: string
  userType: Traits['userType']
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
      userType: traits.userType,
      companyName: traits.company?.name,
    },
    isLoading,
  }
}
