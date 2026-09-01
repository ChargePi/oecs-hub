import { Building2, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AccountType } from '@/lib/auth/types'

interface AccountTypeOption {
  value: AccountType
  label: string
  icon: typeof Building2
}

const OPTIONS: readonly AccountTypeOption[] = [
  { value: 'manufacturer', label: 'Manufacturer', icon: Building2 },
  { value: 'individual', label: 'Individual', icon: User },
]

interface AccountTypeSelectorProps {
  value: AccountType
  onChange: (value: AccountType) => void
}

// Drives which Kratos identity schema register-page.tsx creates the flow against
// (identitySchema) - manufacturer and individual are separate schemas, not a trait, so
// picking a value here means fetching a whole new flow, not just filtering nodes.
export function AccountTypeSelector({ value, onChange }: AccountTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Account type">
      {OPTIONS.map((option) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors',
              selected
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-border hover:bg-muted/40',
            )}
          >
            <Icon
              className={cn('size-5', selected ? 'text-primary' : 'text-muted-foreground')}
              aria-hidden="true"
            />
            <span className={cn('text-sm font-medium', !selected && 'text-muted-foreground')}>
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
