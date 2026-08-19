import { Settings } from '@ory/elements-react/theme'
import '@ory/elements-react/theme/styles.css'

import { frontendApi, oryClientConfiguration } from '@/lib/auth/client'
import { AuthFlowError } from '../auth/auth-flow-error'
import { useFlow } from '../auth/use-flow'
import { SettingsFlowSection } from './settings-flow-section'
import { ACCOUNT_SECTIONS } from './settings-node-groups'

export function ProfilePage() {
  const { flow, error } = useFlow(
    () => frontendApi.createBrowserSettingsFlow(),
    (id) => frontendApi.getSettingsFlow({ id }),
  )

  if (error) return <AuthFlowError />
  if (!flow) return null

  return (
    <div className="oecs-settings-wide mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and security settings.
        </p>
      </div>
      <Settings flow={flow} config={oryClientConfiguration}>
        <SettingsFlowSection sections={ACCOUNT_SECTIONS} />
      </Settings>
    </div>
  )
}
