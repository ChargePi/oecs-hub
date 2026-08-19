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
  UiNodeGroupEnum.Oidc,
] as const

export interface AccountSection {
  title: string
  groups: readonly UiNodeGroupEnum[]
}

// The Profile page consolidates what used to be two separate routes/menu items into one
// page with two labeled sections, rather than two field-groups indistinguishable from the
// rest (SettingsFlowSection already puts a divider between every individual method-group -
// Password, Totp, Webauthn, ... - so without a section heading "Security" would just look
// like more of the same list Profile started).
export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { title: 'Profile', groups: PROFILE_GROUPS },
  { title: 'Security', groups: SECURITY_GROUPS },
]
