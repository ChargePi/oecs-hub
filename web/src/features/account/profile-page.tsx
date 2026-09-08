import { Settings } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'
import { useState } from 'react'

import { BillingSection } from '@/features/billing/billing-section'
import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { BILLING_ENABLED } from '@/lib/billing/config'
import { cn } from '@/lib/utils'
import { AuthFlowError } from '../auth/auth-flow-error'
import { useFlow } from '../auth/use-flow'
import { DeleteAccountSection } from './delete-account-section'
import { SettingsFlowSection } from './settings-flow-section'
import { PROFILE_SECTION, SECURITY_SECTION, SOCIAL_LINKS_SECTION } from './settings-node-groups'

type ProfileTab = 'general' | 'security' | 'social-links' | 'billing' | 'delete-account'

const NAV_ITEMS: { value: ProfileTab; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'security', label: 'Security' },
  { value: 'social-links', label: 'Social Links' },
  ...(BILLING_ENABLED ? [{ value: 'billing' as const, label: 'Billing' }] : []),
  { value: 'delete-account', label: 'Delete account' },
]

export function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('general')
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserSettingsFlow(),
    (id) => frontendApi.getSettingsFlow({ id }),
  )

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="oecs-settings-wide mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and security settings.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 md:w-48 md:flex-col">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                'rounded-md px-3 py-2 text-left text-sm transition-colors',
                tab === item.value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {/* Kept mounted across every tab - only General/Security/Social Links need
              Ory's context, but there's no reason to remount it on tab switches. */}
          <Settings flow={flow} config={oryClientConfiguration}>
            {tab === 'general' && <SettingsFlowSection sections={[PROFILE_SECTION]} />}
            {tab === 'security' && <SettingsFlowSection sections={[SECURITY_SECTION]} />}
            {tab === 'social-links' && <SettingsFlowSection sections={[SOCIAL_LINKS_SECTION]} />}
            {tab === 'billing' && <BillingSection />}
            {tab === 'delete-account' && <DeleteAccountSection />}
          </Settings>
        </div>
      </div>
    </div>
  )
}
