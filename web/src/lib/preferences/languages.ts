export interface Language {
  code: string
  label: string
  locale: string
}

export const SUPPORTED_LANGUAGES: Language[] = [{ code: 'en', label: 'English', locale: 'en-US' }]

export function localeFor(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.locale ?? SUPPORTED_LANGUAGES[0].locale
}
