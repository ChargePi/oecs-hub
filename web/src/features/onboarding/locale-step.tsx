import type { ReactNode } from 'react'

import { OptionGroup } from '@/components/option-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRICE_CURRENCIES } from '@/lib/oecs/currencies'
import { SUPPORTED_LANGUAGES } from '@/lib/preferences/languages'
import { UNIT_OPTIONS } from '@/lib/preferences/options'
import type { Preferences } from '@/lib/preferences/types'

export type LocalePreferences = Pick<Preferences, 'language' | 'currency' | 'unitSystem'>

interface LocaleStepProps {
  value: LocalePreferences
  showUnits: boolean
  onChange: (patch: Partial<LocalePreferences>) => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-foreground">{label}</h2>
      {children}
    </div>
  )
}

export function LocaleStep({ value, showUnits, onChange }: LocaleStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Field label="Language">
        <Select value={value.language} onValueChange={(language) => onChange({ language })}>
          <SelectTrigger className="w-full" aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Currency">
        <Select value={value.currency} onValueChange={(currency) => onChange({ currency })}>
          <SelectTrigger className="w-full" aria-label="Currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRICE_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {showUnits && (
        <Field label="Units">
          <OptionGroup
            label="Units"
            className="grid-cols-2"
            options={UNIT_OPTIONS}
            value={value.unitSystem}
            onChange={(unitSystem) => onChange({ unitSystem })}
          />
        </Field>
      )}
    </div>
  )
}
