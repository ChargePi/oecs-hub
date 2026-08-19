// Mirrors deployments/docker/kratos/identity.schema.json's traits shape. userType is a
// schema-level const("manufacturer") today - see AccountTypeSelector for why normal
// users are "coming soon" rather than disabled here too.
export interface Traits {
  email: string
  name?: string
  userType: 'manufacturer'
  company?: {
    name?: string
    country?: string
  }
}
