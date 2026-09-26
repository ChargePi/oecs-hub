import { runtimeEnv } from '@/lib/runtime-env'

export const CHATWOOT_BASE_URL = runtimeEnv.chatwootBaseUrl.replace(/\/+$/, '')
export const CHATWOOT_WEBSITE_TOKEN = runtimeEnv.chatwootWebsiteToken

export const SUPPORT_CHAT_ENABLED = CHATWOOT_BASE_URL !== '' && CHATWOOT_WEBSITE_TOKEN !== ''
