import type { ReactNode } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { PRICE_CURRENCIES } from '@/lib/oecs/currencies'
import { SUPPORTED_LANGUAGES } from '@/lib/preferences/languages'
import type { ChatLayout, UnitSystem, ViewMode } from '@/lib/preferences/types'
import { usePreferences, useUpdatePreferences } from '@/lib/preferences/use-preferences'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

const UNIT_OPTIONS: Option<UnitSystem>[] = [
  { value: 'metric', label: 'Metric', description: 'mm, m, kg, °C' },
  { value: 'imperial', label: 'Imperial', description: 'in, ft, lb, °F' },
]

const VIEW_MODE_OPTIONS: Option<ViewMode>[] = [
  {
    value: 'simplified',
    label: 'Simplified',
    description: 'Essential specs and filters, no graph view',
  },
  { value: 'advanced', label: 'Advanced', description: 'Every spec, filter and the graph view' },
]

const CHAT_LAYOUT_OPTIONS: Option<ChatLayout>[] = [
  { value: 'auto', label: 'Automatic', description: 'Page in simplified view, drawer in advanced' },
  { value: 'drawer', label: 'Drawer', description: 'Docked beside the page you are on' },
  { value: 'page', label: 'Dedicated page', description: 'Full-screen chat' },
]

function PreferenceRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 pb-6 last:border-b-0">
      <div>
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T
  disabled: boolean
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60',
            value === option.value
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <span className="font-medium">{option.label}</span>
          {option.description && <span className="text-xs">{option.description}</span>}
        </button>
      ))}
    </div>
  )
}

export function PreferencesSection() {
  const preferences = usePreferences()
  const { update, isPending } = useUpdatePreferences()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Changes are saved automatically and apply on every device you sign in on.
        </p>
      </div>

      <PreferenceRow label="Language" description="Language used across the app.">
        <Select
          value={preferences.language}
          disabled={isPending}
          onValueChange={(language) => void update({ language })}
        >
          <SelectTrigger className="w-48" aria-label="Language">
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
      </PreferenceRow>

      <PreferenceRow
        label="Default currency"
        description="Prices in this currency are listed first and used for the price filter. Prices are not converted."
      >
        <Select
          value={preferences.currency}
          disabled={isPending}
          onValueChange={(currency) => void update({ currency })}
        >
          <SelectTrigger className="w-48" aria-label="Default currency">
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
      </PreferenceRow>

      <PreferenceRow label="Units" description="Units for lengths, weights and temperatures.">
        <OptionGroup
          label="Units"
          options={UNIT_OPTIONS}
          value={preferences.unitSystem}
          disabled={isPending}
          onChange={(unitSystem) => void update({ unitSystem })}
        />
      </PreferenceRow>

      <PreferenceRow label="View mode" description="How much detail the app shows.">
        <OptionGroup
          label="View mode"
          options={VIEW_MODE_OPTIONS}
          value={preferences.viewMode}
          disabled={isPending}
          onChange={(viewMode) => void update({ viewMode })}
        />
      </PreferenceRow>

      {CHAT_ENABLED && (
        <PreferenceRow label="Chat assistant" description="Where the chat assistant opens.">
          <OptionGroup
            label="Chat assistant"
            options={CHAT_LAYOUT_OPTIONS}
            value={preferences.chatLayout}
            disabled={isPending}
            onChange={(chatLayout) => void update({ chatLayout })}
          />
        </PreferenceRow>
      )}
    </div>
  )
}
