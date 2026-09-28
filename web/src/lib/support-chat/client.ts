import { BILLING_API_BASE } from '@/lib/billing/config'

import { SupportChatServiceClient } from '../registry/gen/supportchat/v1/SupportchatServiceClientPb'
import { GetIdentityRequest } from '../registry/gen/supportchat/v1/supportchat_pb'

const client = new SupportChatServiceClient(BILLING_API_BASE, null, null)

export interface SupportChatIdentity {
  identifier: string
  identifierHash: string
  planTier: string
}

export async function getSupportChatIdentity(): Promise<SupportChatIdentity> {
  const resp = await client.getIdentity(new GetIdentityRequest(), {})
  return {
    identifier: resp.getIdentifier(),
    identifierHash: resp.getIdentifierHash(),
    planTier: resp.getPlanTier(),
  }
}
