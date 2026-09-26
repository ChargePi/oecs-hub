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
