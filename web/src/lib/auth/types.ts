// Mirrors deployments/docker/kratos/identity.schema.json's traits shape.
export interface Traits {
  email: string
  name?: string
  userType: 'manufacturer' | 'individual'
  company?: {
    name?: string
    country?: string
  }
  billingAddress?: {
    streetAddress?: string
    postalCode?: string
    country?: string
  }
}
