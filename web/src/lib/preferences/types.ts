export type UnitSystem = 'metric' | 'imperial'
export type ViewMode = 'simplified' | 'advanced'
/** 'auto' follows the view mode. */
export type ChatLayout = 'auto' | 'drawer' | 'page'

export interface Preferences {
  currency: string
  unitSystem: UnitSystem
  viewMode: ViewMode
  chatLayout: ChatLayout
  language: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  currency: 'EUR',
  unitSystem: 'metric',
  viewMode: 'advanced',
  chatLayout: 'auto',
  language: 'en',
}
