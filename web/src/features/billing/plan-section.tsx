import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { redirectToLogin, useIdentity } from '@/lib/auth/use-identity'
import { changePlan, getPlans, getUsage } from '@/lib/billing/client'
import type { Plan, Usage } from '@/lib/billing/types'
import { AuthRequiredError, errorSeverity } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { toastError } from '@/stores/toast-store'
import { priceHeadline, usageLine } from '@/lib/billing/plan-format'

interface PlanSectionProps {
  onShowInvoices: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

function UsageMeter({ usage }: { usage: Usage }) {
  if (usage.metrics.length === 0) {
    return <p className="text-xs text-muted-foreground">No usage recorded yet this period.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {usage.metrics.map((metric) => {
        const consumed = metric.consumedUnits.toLocaleString()
        const included = metric.includedUnits
        const percent = included ? Math.min(100, (metric.consumedUnits / included) * 100) : null

        return (
          <div key={metric.code} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{metric.name} this period</span>
              <span className="font-medium text-foreground">
                {included ? `${consumed} / ${included.toLocaleString()}` : consumed}
              </span>
            </div>
            {percent !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={cn('h-full rounded-full', percent >= 90 ? 'bg-destructive' : 'bg-primary')}
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

export function PlanSection({ onShowInvoices }: PlanSectionProps) {
  const queryClient = useQueryClient()
  const { identity } = useIdentity()
  const usage = useQuery({ queryKey: ['billing', 'usage'], queryFn: getUsage })
  const plans = useQuery({ queryKey: ['billing', 'plans'], queryFn: getPlans })

  const [target, setTarget] = useState<Plan | null>(null)
  const [isChanging, setIsChanging] = useState(false)
  const [outstandingUrl, setOutstandingUrl] = useState<string | null>(null)

  if (usage.isLoading || plans.isLoading || !identity) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    )
  }

  if (usage.isError || plans.isError || !usage.data || !plans.data) {
    return (
      <p className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
        Plan information isn&apos;t available right now. If you just signed up, check back shortly.
      </p>
    )
  }

  const current = usage.data
  const available = plans.data.filter((p) => p.accountType === identity.userType)
  const nextPlan = available.find((p) => p.code === current.nextPlanCode)
  const isUpgrade = target?.tier === 'paid'

  async function handleConfirm() {
    if (!target) return
    setIsChanging(true)

    try {
      const result = await changePlan(target.code)

      switch (result.status) {
        case 'applied':
        case 'scheduled':
          setOutstandingUrl(null)
          await queryClient.invalidateQueries({ queryKey: ['billing'] })
          break
        case 'outstanding-invoices':
          setOutstandingUrl(result.actionUrl ?? null)
          if (result.actionUrl) window.open(result.actionUrl, '_blank', 'noopener,noreferrer')
          break
        case 'payment-method-required':
          if (result.actionUrl) {
            window.location.href = result.actionUrl
            return
          }
          toastError("Couldn't open the payment page. Please try again shortly.")
          break
      }
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin()
        return
      }
      toastError("Couldn't change your plan. Please try again shortly.", undefined, errorSeverity(err))
    } finally {
      setIsChanging(false)
      setTarget(null)
    }
  }

  if (available.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
        There are no plans to choose from for your account type.
      </p>
    )
  }

  function planAction(plan: Plan) {
    if (plan.code === current.planCode) {
      return (
        <Button variant="outline" className="w-full" disabled>
          Current plan
        </Button>
      )
    }

    if (plan.code === nextPlan?.code && current.nextPlanAt) {
      return (
        <Button variant="outline" className="w-full" disabled>
          Starts {formatDate(current.nextPlanAt)}
        </Button>
      )
    }

    return (
      <Button
        variant={plan.tier === 'paid' ? 'default' : 'outline'}
        className="w-full"
        onClick={() => setTarget(plan)}
      >
        {plan.tier === 'paid' ? 'Upgrade plan' : 'Downgrade plan'}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {nextPlan && current.nextPlanAt && (
        <Alert>
          <AlertTitle>Plan change scheduled</AlertTitle>
          <AlertDescription>
            You&apos;ll switch to {nextPlan.displayName} on {formatDate(current.nextPlanAt)}. Until
            then, your current plan stays active.
          </AlertDescription>
        </Alert>
      )}

      {outstandingUrl && (
        <Alert variant="destructive">
          <AlertTitle>Unpaid invoices</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            Please pay your open invoices before upgrading, then choose the plan again.
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <a href={outstandingUrl} target="_blank" rel="noopener noreferrer">
                  Open payment portal
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={onShowInvoices}>
                View invoices
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {available.map((plan) => {
          const isCurrent = plan.code === current.planCode

          return (
            <div
              key={plan.code}
              className={cn(
                'flex flex-col gap-5 rounded-xl border p-5',
                isCurrent ? 'border-border bg-muted/60' : 'border-border/60 bg-card',
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{plan.displayName}</span>
                <span className="text-xs text-muted-foreground">{usageLine(plan)}</span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-foreground">{priceHeadline(plan)}</span>
                {plan.tier === 'paid' && (
                  <span className="text-xs text-muted-foreground">per {plan.interval.replace(/ly$/, '')}</span>
                )}
              </div>

              {isCurrent && (
                <div className="flex flex-col gap-2">
                  <UsageMeter usage={current} />
                  <p className="text-[11px] text-muted-foreground">
                    Current period: {formatDate(current.periodStart)} – {formatDate(current.periodEnd)}
                  </p>
                </div>
              )}

              <div className="mt-auto">{planAction(plan)}</div>
            </div>
          )
        })}
      </div>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && !isChanging && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {target?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isUpgrade
                ? 'Your new plan starts immediately. Usage so far on your current plan is invoiced now. You need a payment method on file and no unpaid invoices.'
                : `Your current plan stays active until the end of this billing period${
                    current.periodEnd ? ` (${formatDate(current.periodEnd)})` : ''
                  }, then you'll switch to ${target?.displayName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConfirm()
              }}
              disabled={isChanging}
            >
              {isChanging ? 'Switching…' : isUpgrade ? 'Upgrade' : 'Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
