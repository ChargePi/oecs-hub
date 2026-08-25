const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** Formats an ISO timestamp as "3 minutes ago" / "just now", for list rows. */
export function formatRelativeTime(iso: string | undefined): string {
  const ms = iso ? new Date(iso).getTime() : NaN
  if (!Number.isFinite(ms)) return ''

  const seconds = Math.round((ms - Date.now()) / 1000)
  const abs = Math.abs(seconds)

  if (abs < 60) return 'just now'

  for (const [unit, unitSeconds] of UNITS) {
    if (abs >= unitSeconds) return rtf.format(Math.round(seconds / unitSeconds), unit)
  }
  return rtf.format(Math.round(seconds / 60), 'minute')
}
