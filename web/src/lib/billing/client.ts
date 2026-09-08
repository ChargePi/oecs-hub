import { RpcError } from 'grpc-web'

import { BillingServiceClient } from '@/lib/registry/gen/billing/v1/BillingServiceClientPb'
import {
  AccountType as ProtoAccountType,
  GetPaymentPortalUrlRequest,
  GetPlansRequest,
  GetUsageRequest,
  ListInvoicesRequest,
  PlanTier as ProtoPlanTier,
} from '@/lib/registry/gen/billing/v1/billing_pb'

import { BILLING_API_BASE } from './config'
import type { Invoice, InvoicesPage, Plan, PlanAccountType, PlanTier, Usage } from './types'

const ACCOUNT_TYPE_FROM_PROTO: Record<ProtoAccountType, PlanAccountType | undefined> = {
  [ProtoAccountType.ACCOUNT_TYPE_UNSPECIFIED]: undefined,
  [ProtoAccountType.ACCOUNT_TYPE_INDIVIDUAL]: 'individual',
  [ProtoAccountType.ACCOUNT_TYPE_MANUFACTURER]: 'manufacturer',
}

const TIER_FROM_PROTO: Record<ProtoPlanTier, PlanTier | undefined> = {
  [ProtoPlanTier.PLAN_TIER_UNSPECIFIED]: undefined,
  [ProtoPlanTier.PLAN_TIER_FREE]: 'free',
  [ProtoPlanTier.PLAN_TIER_PAID]: 'paid',
}

// Identity comes from forwardAuth headers - every RPC here is self-service, so no
// user/customer id is ever set on the request itself.
const client = new BillingServiceClient(BILLING_API_BASE, null, null)

function mapError(err: unknown, context: string): never {
  if (err instanceof RpcError) {
    console.error(`billing request failed: ${context}`, err.code, err.message)
    throw new Error(err.message)
  }
  console.error(`billing request failed: ${context}`, err)
  throw err instanceof Error ? err : new Error(String(err))
}

export async function getUsage(): Promise<Usage> {
  try {
    const resp = await client.getUsage(new GetUsageRequest(), {})
    return {
      planName: resp.getPlanName(),
      tier: TIER_FROM_PROTO[resp.getTier()],
      metrics: resp.getMetricsList().map((m) => ({
        code: m.getCode(),
        name: m.getName(),
        consumedUnits: m.getConsumedUnits(),
        includedUnits: m.hasIncludedUnits() ? m.getIncludedUnits() : undefined,
      })),
      periodStart: resp.getPeriodStart()?.toDate().toISOString() ?? '',
      periodEnd: resp.getPeriodEnd()?.toDate().toISOString() ?? '',
    }
  } catch (err) {
    mapError(err, 'getUsage')
  }
}

export async function listInvoices(params: {
  pageSize: number
  pageToken?: string
}): Promise<InvoicesPage> {
  const req = new ListInvoicesRequest()
  req.setPageSize(params.pageSize)
  req.setPageToken(params.pageToken ?? '')

  try {
    const resp = await client.listInvoices(req, {})
    const invoices: Invoice[] = resp.getInvoicesList().map((inv) => ({
      id: inv.getId(),
      number: inv.getNumber(),
      status: inv.getStatus(),
      amountCents: inv.getAmountCents(),
      currency: inv.getCurrency(),
      issuedAt: inv.getIssuedAt()?.toDate().toISOString() ?? '',
      pdfUrl: inv.getPdfUrl() || undefined,
    }))

    return {
      invoices,
      nextPageToken: resp.getNextPageToken(),
      totalSize: resp.getTotalSize(),
    }
  } catch (err) {
    mapError(err, 'listInvoices')
  }
}

export async function getPaymentPortalUrl(): Promise<string> {
  try {
    const resp = await client.getPaymentPortalUrl(new GetPaymentPortalUrlRequest(), {})
    return resp.getUrl()
  } catch (err) {
    mapError(err, 'getPaymentPortalUrl')
  }
}

// The one public RPC on this service - callable from the still-unauthenticated
// registration wizard (see access-rules.yml's billing-service-public rule).
export async function getPlans(): Promise<Plan[]> {
  try {
    const resp = await client.getPlans(new GetPlansRequest(), {})
    return resp
      .getPlansList()
      .map((p) => {
        const accountType = ACCOUNT_TYPE_FROM_PROTO[p.getAccountType()]
        const tier = TIER_FROM_PROTO[p.getTier()]
        if (!accountType || !tier) return null

        return {
          code: p.getCode(),
          displayName: p.getDisplayName(),
          amountCents: p.getAmountCents(),
          currency: p.getCurrency(),
          interval: p.getInterval(),
          accountType,
          tier,
        }
      })
      .filter((p): p is Plan => p !== null)
  } catch (err) {
    mapError(err, 'getPlans')
  }
}
