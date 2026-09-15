import { BILLING_ENABLED } from '@/lib/billing/config'

// Billing off: just Account type -> General info (registration-wizard.tsx's own
// `skipPlan` collapses Plan/submit into that same step). Billing on: the full 4-step
// sequence, with Plan and Billing as their own steps - Billing lives on its own route
// (register-complete-page.tsx), reached via Kratos's own post-registration redirect,
// not as in-SPA state here, so this needs sharing between both pages.
export const REGISTRATION_STEP_LABELS = BILLING_ENABLED
  ? (['Account type', 'General info', 'Plan', 'Billing'] as const)
  : (['Account type', 'General info'] as const)
