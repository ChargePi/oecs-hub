import { Building2, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Purely presentational - the registration form below only ever submits a manufacturer
// account (userType is a schema-level const in deployments/docker/kratos/identity.schema.json),
// so "Individual" can't actually be selected yet. Enforcing this at the schema layer,
// not just here, is deliberate: see the auth plan's §3.7.
export function AccountTypeSelector() {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Account type">
      <div
        className="flex flex-col items-center gap-1.5 rounded-lg border border-primary bg-primary/5 px-3 py-3 text-center"
        aria-current="true"
      >
        <Building2 className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">Manufacturer</span>
      </div>

      <div
        className={cn(
          'flex flex-col items-center gap-1.5 rounded-lg border border-border/60 px-3 py-3 text-center opacity-60',
        )}
        aria-disabled="true"
      >
        <User className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-muted-foreground">Individual</span>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
    </div>
  )
}
