import type { AccountType } from './types'

// Manufacturer and business accounts register a company (traits.company).
export function hasCompanyProfile(type: AccountType): boolean {
  return type === 'manufacturer' || type === 'business'
}

// Favorites, projects and ratings - the "my chargers" set, for individual and business.
export function canUseUserChargers(type: AccountType): boolean {
  return type === 'individual' || type === 'business'
}

// Only manufacturers submit schema specs.
export function canSubmitSpecs(type: AccountType): boolean {
  return type === 'manufacturer'
}
