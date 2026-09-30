import type { Plan } from './types'

export function priceHeadline(plan: Plan): string {
  if (plan.tier === 'free' || plan.amountCents === 0) return 'Free'
  return (plan.amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: plan.currency || 'EUR',
  })
}

export function commitmentLine(plan: Plan): string {
  return plan.tier === 'paid' ? `Billed ${plan.interval}, cancel anytime` : 'No credit card required'
}

// GetPlans's `tokens` metric is the same one chat-access-gate.tsx reads from GetUsage
// (metrics.find(m => m.code === 'tokens')) - the one billable metric this system meters,
// spent by the AI chat feature (recommendations, charger comparisons, general EV/charger
// Q&A - see chat-access-gate.tsx's own "token allowance" copy). `includedUnits` is that
// metric's free monthly allowance; unset on a paid, pay-per-use plan, which is why
// "unlimited usage" is always true for those.
export function usageLine(plan: Plan): string {
  if (plan.tier === 'paid') return 'Unlimited usage, billed per token'
  return plan.includedUnits !== undefined
    ? `${plan.includedUnits.toLocaleString()} tokens/month included`
    : 'Limited monthly usage'
}
