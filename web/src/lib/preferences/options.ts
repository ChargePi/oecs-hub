import type { Option } from '@/components/option-group'

import type { UnitSystem } from './types'

export const UNIT_OPTIONS: Option<UnitSystem>[] = [
  { value: 'metric', label: 'Metric', description: 'mm, m, kg, °C' },
  { value: 'imperial', label: 'Imperial', description: 'in, ft, lb, °F' },
]
