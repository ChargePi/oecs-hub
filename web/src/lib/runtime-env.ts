// Per-environment config, set by /env.js at container start (see nginx.conf.template).
// Falls back to VITE_* for `pnpm dev`, where public/env.js leaves it empty.
interface RuntimeEnv {
  chatwootBaseUrl?: string
  chatwootWebsiteToken?: string
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv
  }
}

const env = window.__ENV__ ?? {}

export const runtimeEnv = {
  chatwootBaseUrl: env.chatwootBaseUrl || import.meta.env.VITE_CHATWOOT_BASE_URL || '',
  chatwootWebsiteToken:
    env.chatwootWebsiteToken || import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN || '',
}
