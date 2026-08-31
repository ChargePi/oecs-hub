import { Configuration, FrontendApi } from '@ory/client-fetch'
import type { OryClientConfiguration } from '@ory/elements-react'

// Same-origin, proxied to Kratos's public API - by Traefik under docker compose (see the
// auth plan's §1.5), or directly by Vite's dev proxy in the bare `pnpm dev` loop (see
// vite.config.ts). Never a cross-origin request, so no CORS config needed here.
const BASE_PATH = '/ory'

// Without this, Kratos treats every call (flow-init AND form-submit) as a classic
// server-rendered browser request and responds with a 303 redirect instead of JSON -
// for flow-init that redirect lands back on this SPA's own /auth/login route (index.html,
// not JSON), which `fetch()` follows automatically and the SDK then fails to parse.
// `Accept: application/json` is what tells Kratos to respond with the flow/result body
// directly instead. See https://www.ory.sh/docs/kratos/self-service/flows/user-login
// ("Browser flows with an accept header of application/json will not redirect").
const JSON_HEADERS = { Accept: 'application/json' }

// `project` mirrors OryClientConfiguration's Ory-Network-shaped "project" concept, which
// self-hosted Kratos has no equivalent endpoint for - so it's hand-written here rather
// than fetched, matching the UI URLs already configured in deployments/docker/kratos/kratos.yml.
export const oryClientConfiguration: OryClientConfiguration = {
  sdk: {
    url: BASE_PATH,
    options: { credentials: 'include' as const, headers: JSON_HEADERS },
  },
  project: {
    name: 'OECS Hub',
    // Purely a frontend rendering flag in elements-react - not gated behind an Ory
    // Network plan the way its doc comment implies, since we're self-hosting Kratos and
    // this "project" config is hand-written, not fetched from Ory at all.
    hide_ory_branding: true,
    default_redirect_url: '/',
    error_ui_url: '/auth/error',
    login_ui_url: '/auth/login',
    recovery_enabled: true,
    recovery_ui_url: '/auth/recovery',
    registration_enabled: true,
    registration_ui_url: '/auth/register',
    settings_ui_url: '/profile',
    verification_enabled: true,
    verification_ui_url: '/auth/verification',
  },
}

export const frontendApi = new FrontendApi(
  new Configuration({ basePath: BASE_PATH, credentials: 'include', headers: JSON_HEADERS }),
)
