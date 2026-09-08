// Only controls whether the /billing UI exists in the build at all - baked in at build
// time via VITE_FEATURE_BILLING.
export const BILLING_ENABLED = import.meta.env.VITE_FEATURE_BILLING === 'true'

// oecs-billing-service, reached directly via Traefik's "billing" router - same pattern
// as CONVERSATION_API_BASE.
export const BILLING_API_BASE = '/billing-api'
