import type { ReactNode } from 'react'

import { OptionGroup, type Option } from '@/components/option-group'
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
import { UNIT_OPTIONS } from '@/lib/preferences/options'
import type { ChatLayout, ViewMode } from '@/lib/preferences/types'
import { usePreferences, useUpdatePreferences } from '@/lib/preferences/use-preferences'

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
