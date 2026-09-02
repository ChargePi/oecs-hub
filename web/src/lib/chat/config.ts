// The chat feature calls oecs-recommendation-agent's ConversationService directly
// (gRPC-Web) - no oecs-registry backend involved. This flag only controls whether the
// UI for it exists in the build at all (baked in via Vite's `import.meta.env` - see
// web/.env.example and the Dockerfile's VITE_FEATURE_CHAT build arg); whether it
// actually works depends on Traefik/that service being reachable, surfaced as a normal
// request error if not.
export const CHAT_ENABLED = import.meta.env.VITE_FEATURE_CHAT === 'true'

/**
 * Same-origin path the chat client calls - proxied straight to ConversationService's
 * gRPC-Web port by Vite (dev) or Traefik (prod), mirroring lib/registry's `/api` and
 * Kratos's `/ory`. Distinct from `/api` since it's a different backend (a different
 * repo/service entirely, not oecs-registry's own).
 */
export const CONVERSATION_API_BASE = '/conversation-api'
