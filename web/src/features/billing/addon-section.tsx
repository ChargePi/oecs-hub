import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { cancelAddon, getAddonPlans, getUsage, subscribeAddon } from '@/lib/billing/client'
import type { Addon, AddonPlan } from '@/lib/billing/types'
import { AuthRequiredError, errorSeverity } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { toastError } from '@/stores/toast-store'

const DESCRIPTIONS: Record<string, { text: string; href: string; cta: string }> = {
  planning_agent: {
    text: 'The Planner: plan charging sites, model their power and communication topology and check capacity, with an assistant that learns your use case and proposes changes you approve. Available on any plan, free included.',
    href: '/planner/',
    cta: 'Open the planner',
  },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

function price(plan: AddonPlan): string {
  return (plan.amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: plan.currency || 'EUR',
  })
}

function AddonUsage({ addon }: { addon: Addon }) {
  return (
    <div className="flex flex-col gap-2">
      {addon.metrics.map((metric) => {
        const included = metric.includedUnits
        const percent = included ? Math.min(100, (metric.consumedUnits / included) * 100) : null

        return (
          <div key={metric.code} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{metric.name} this period</span>
              <span className="font-medium text-foreground">
                {included
                  ? `${metric.consumedUnits.toLocaleString()} / ${included.toLocaleString()}`
                  : metric.consumedUnits.toLocaleString()}
              </span>
            </div>
            {percent !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    'h-full rounded-full',
                    percent >= 90 ? 'bg-destructive' : 'bg-primary',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AddonSection() {
  const queryClient = useQueryClient()
  const usage = useQuery({ queryKey: ['billing', 'usage'], queryFn: getUsage })
  const plans = useQuery({ queryKey: ['billing', 'addon-plans'], queryFn: getAddonPlans })
  const [cancelling, setCancelling] = useState<AddonPlan | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  if (usage.isLoading || plans.isLoading) return <Skeleton className="h-36 w-full" />
  if (!usage.data || !plans.data || plans.data.length === 0) return null

  const current = usage.data

  async function run(plan: AddonPlan, action: () => Promise<void>) {
    setPending(plan.code)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['billing'] })
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin()
        return
      }
      toastError(
        "Couldn't update your add-on. Please try again shortly.",
        undefined,
        errorSeverity(err),
      )
    } finally {
      setPending(null)
    }
  }

  const subscribe = (plan: AddonPlan) =>
    run(plan, async () => {
      const result = await subscribeAddon(plan.code)

      if (result.status === 'payment-method-required' || result.status === 'outstanding-invoices') {
        if (result.actionUrl) window.location.href = result.actionUrl
        else toastError("Couldn't open the payment page. Please try again shortly.")
      }
    })

  const cancel = (plan: AddonPlan) =>
    run(plan, async () => {
      await cancelAddon(plan.code)
      setCancelling(null)
    })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-foreground">Add-ons</h3>
        <p className="text-sm text-muted-foreground">Optional extras billed next to your plan.</p>
      </div>

      {plans.data.map((plan) => {
        const addon = current.addons.find((a) => a.key === plan.key)
        const eligible = !plan.requiresTier || current.tier === plan.requiresTier
        const about = DESCRIPTIONS[plan.key]

        return (
          <div
            key={plan.code}
            className={cn(
              'flex flex-col gap-4 rounded-xl border p-5',
              addon ? 'border-border bg-muted/60' : 'border-border/60 bg-card',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex max-w-xl flex-col gap-1">
                <span className="font-semibold text-foreground">{plan.displayName}</span>
                {about && <span className="text-sm text-muted-foreground">{about.text}</span>}
                {plan.includedUnits !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {plan.includedUnits.toLocaleString()} assistant tokens/month included
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{price(plan)}</span>
                <span className="text-xs text-muted-foreground">
                  per {plan.interval.replace(/ly$/, '')}
                </span>
              </div>
            </div>

            {addon && <AddonUsage addon={addon} />}

            <div className="flex flex-wrap items-center gap-2">
              {!addon && (
                <Button
                  onClick={() => void subscribe(plan)}
                  disabled={!eligible || pending === plan.code}
                >
                  {pending === plan.code ? 'Adding…' : 'Add to my plan'}
                </Button>
              )}
              {!addon && !eligible && (
                <span className="text-xs text-muted-foreground">Available on paid plans.</span>
              )}
              {addon?.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => setCancelling(plan)}
                  disabled={pending === plan.code}
                >
                  Cancel add-on
                </Button>
              )}
              {addon?.status === 'ending' && addon.endsAt && (
                <span className="text-sm text-muted-foreground">
                  Active until {formatDate(addon.endsAt)}
                </span>
              )}
              {addon && about && (
                <Button variant="ghost" asChild>
                  <a href={about.href}>{about.cta}</a>
                </Button>
              )}
            </div>
          </div>
        )
      })}

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && !pending && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {cancelling?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              It stays active until the end of the current billing period, then ends. Your
              conversations are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!pending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (cancelling) void cancel(cancelling)
              }}
              disabled={!!pending}
            >
              Cancel add-on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
