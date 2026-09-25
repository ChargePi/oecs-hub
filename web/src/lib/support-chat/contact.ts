import type { Session } from '@ory/client-fetch'

import type { ChatwootUser } from './chatwoot'

// Mirrors deployments/docker/kratos/chatwoot_contact_hook.jsonnet (the signup-time copy) -
// keep attribute keys in sync with it and oecs-billing-service's
// deployments/provisioning/chatwoot.example.yaml (contact attribute definitions).
interface Address {
  name?: string
  streetAddress?: string
  postalCode?: string
  country?: string
}

interface AnyTraits {
  email: string
  name?: string
  surname?: string
  company?: Address
  billingAddress?: Address
}

export interface ChatwootContact {
  user: ChatwootUser
  customAttributes: Record<string, string | boolean>
}

export function buildChatwootContact(
  session: Session,
  signed: { identifierHash: string; planTier: string },
): ChatwootContact {
  const identity = session.identity!
  const traits = identity.traits as AnyTraits
  const address = traits.company ?? traits.billingAddress ?? {}
  const country = address.country?.trim() ?? ''
  const name = [traits.name, traits.surname].filter(Boolean).join(' ')
  const email = identity.verifiable_addresses?.find((a) => a.value === traits.email)

  const customAttributes: Record<string, string | boolean> = {
    account_type: identity.schema_id,
    email_verified: email?.verified ?? false,
    locale: navigator.language,
  }
  if (address.streetAddress) customAttributes.street_address = address.streetAddress
  if (address.postalCode) customAttributes.postal_code = address.postalCode
  if (country) customAttributes.country = country
  if (identity.created_at) customAttributes.signed_up_at = identity.created_at.toISOString()
  if (signed.planTier) customAttributes.plan_tier = signed.planTier

  return {
    user: {
      email: traits.email,
      name: name || traits.email,
      identifier_hash: signed.identifierHash,
      ...(traits.company?.name ? { company_name: traits.company.name } : {}),
      ...(/^[a-z]{2}$/i.test(country) ? { country_code: country.toUpperCase() } : {}),
    },
    customAttributes,
  }
}
