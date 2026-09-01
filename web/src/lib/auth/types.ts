// The Kratos identity schema id, not a trait - manufacturer and individual are separate
// schemas (deployments/docker/kratos/identity.manufacturer.schema.json /
// identity.individual.schema.json), so this is `session.identity.schema_id`, never a
// field inside traits.
export type AccountType = 'manufacturer' | 'individual'

// Mirrors the traits each schema in deployments/docker/kratos/ actually defines - a
// union rather than one shape with everything optional, since which of
// company/billingAddress is present (and required) depends entirely on which schema
// (AccountType) the identity was created under.
export type Traits =
  | { email: string; name?: string; company: { name: string; country?: string } }
  | {
      email: string
      name?: string
      billingAddress: { streetAddress: string; postalCode: string; country?: string }
    }
