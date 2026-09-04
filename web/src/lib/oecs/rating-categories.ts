/**
 * Display order + copy for the known rating categories (mirrors rating_categories seeded by
 * deployments/migrations/003_add_charger_ratings.sql). A category present in a charger's
 * `ratings` but not listed here (a future addition) still renders wherever ratings-section.tsx
 * displays it - this list only fixes the display order and copy for the categories we know
 * about, and is also the source of truth for which categories rate-variant-control.tsx lets a
 * user submit a score for.
 */
export const RATING_CATEGORIES: { name: string; label: string; description: string }[] = [
  {
    name: 'reliability',
    label: 'Reliability',
    description: 'How dependable the charger is in day-to-day use.',
  },
  {
    name: 'support',
    label: 'Support',
    description: "Quality of the manufacturer's customer support.",
  },
  {
    name: 'design',
    label: 'Design',
    description: 'Build quality and physical design.',
  },
  {
    name: 'ease_of_use',
    label: 'Ease of use',
    description: 'How intuitive the charger is to operate.',
  },
]
