import { UiNodeGroupEnum } from '@ory/client-fetch'

// Default (just the csrf token) is deliberately excluded here: SettingsFlowSection
// already merges it into every section unconditionally, so including it as one of the
// *requested* groups made it count as its own present section - an empty "section"
// (invisible, just a hidden input) that still triggered a real, visible stray divider
// before the actual Profile fields.
export const PROFILE_GROUPS = [UiNodeGroupEnum.Profile] as const

export const SECURITY_GROUPS = [
  UiNodeGroupEnum.Password,
  UiNodeGroupEnum.Totp,
  UiNodeGroupEnum.Webauthn,
  UiNodeGroupEnum.Passkey,
  UiNodeGroupEnum.LookupSecret,
] as const

// Split out from Security into its own sidebar segment - linked social login providers
// (Google, ...), not a credential.
export const SOCIAL_GROUPS = [UiNodeGroupEnum.Oidc] as const

export interface AccountSection {
  title: string
  groups: readonly UiNodeGroupEnum[]
}

// One section per Profile page sidebar segment - each rendered on its own via
// SettingsFlowSection, filtered from the single shared settings flow.
export const PROFILE_SECTION: AccountSection = { title: 'General', groups: PROFILE_GROUPS }
export const SECURITY_SECTION: AccountSection = { title: 'Security', groups: SECURITY_GROUPS }
export const SOCIAL_LINKS_SECTION: AccountSection = { title: 'Social Links', groups: SOCIAL_GROUPS }
