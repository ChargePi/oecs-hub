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

export function resetSupportChat(): void {
  window.$chatwoot?.reset()
}
