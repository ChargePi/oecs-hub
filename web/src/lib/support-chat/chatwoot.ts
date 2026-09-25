// Minimal typing of the Chatwoot website SDK (<base>/packs/js/sdk.js).
export interface ChatwootUser {
  email?: string
  name?: string
  identifier_hash?: string
  company_name?: string
  country_code?: string
}

export type ChatwootColorScheme = 'light' | 'dark' | 'auto'

export interface Chatwoot {
  setUser(identifier: string, user: ChatwootUser): void
  setCustomAttributes(attributes: Record<string, string | number | boolean>): void
  toggleBubbleVisibility(visibility: 'show' | 'hide'): void
  setColorScheme(scheme: ChatwootColorScheme): void
  reset(): void
}

declare global {
  interface Window {
    $chatwoot?: Chatwoot
    chatwootSettings?: Record<string, unknown>
    chatwootSDK?: { run(config: { websiteToken: string; baseUrl: string }): void }
  }
}

/** Clears the widget's contact/conversation - call on logout. No-op when not loaded. */
export function resetSupportChat(): void {
  window.$chatwoot?.reset()
}
