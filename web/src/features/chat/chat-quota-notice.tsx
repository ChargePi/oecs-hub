import { Link } from 'react-router'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ChatQuotaNotice() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-left"
    >
      <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-foreground">Token allowance used up</p>
        <p className="text-muted-foreground">Upgrade your plan to keep chatting.</p>
      </div>
      <Button asChild size="sm">
        <Link to="/profile?tab=billing">Upgrade plan</Link>
      </Button>
    </div>
  )
}
