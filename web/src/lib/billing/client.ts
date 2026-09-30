import { normalizeAndDispatch } from '@/lib/errors'
import { BillingServiceClient } from '@/lib/registry/gen/billing/v1/BillingServiceClientPb'
import {
  AccountType as ProtoAccountType,
  ChangePlanRequest,
  GetPaymentPortalUrlRequest,
  GetPlansRequest,
  GetUsageRequest,
  ListInvoicesRequest,
  PlanChangeStatus as ProtoPlanChangeStatus,
  PlanTier as ProtoPlanTier,
} from '@/lib/registry/gen/billing/v1/billing_pb'

import { BILLING_API_BASE } from './config'
import type {
  Invoice,
  InvoicesPage,
  Plan,
  PlanAccountType,
  PlanChangeResult,
  PlanChangeStatus,
  PlanTier,
  Usage,
} from './types'

const ACCOUNT_TYPE_FROM_PROTO: Record<ProtoAccountType, PlanAccountType | undefined> = {
  [ProtoAccountType.ACCOUNT_TYPE_UNSPECIFIED]: undefined,
  [ProtoAccountType.ACCOUNT_TYPE_INDIVIDUAL]: 'individual',
  [ProtoAccountType.ACCOUNT_TYPE_MANUFACTURER]: 'manufacturer',
  [ProtoAccountType.ACCOUNT_TYPE_BUSINESS]: 'business',
}

const TIER_FROM_PROTO: Record<ProtoPlanTier, PlanTier | undefined> = {
  [ProtoPlanTier.PLAN_TIER_UNSPECIFIED]: undefined,
  [ProtoPlanTier.PLAN_TIER_FREE]: 'free',
  [ProtoPlanTier.PLAN_TIER_PAID]: 'paid',
}

const PLAN_CHANGE_STATUS_FROM_PROTO: Record<ProtoPlanChangeStatus, PlanChangeStatus | undefined> = {
  [ProtoPlanChangeStatus.PLAN_CHANGE_STATUS_UNSPECIFIED]: undefined,
  [ProtoPlanChangeStatus.PLAN_CHANGE_STATUS_APPLIED]: 'applied',
  [ProtoPlanChangeStatus.PLAN_CHANGE_STATUS_SCHEDULED]: 'scheduled',
  [ProtoPlanChangeStatus.PLAN_CHANGE_STATUS_OUTSTANDING_INVOICES]: 'outstanding-invoices',
  [ProtoPlanChangeStatus.PLAN_CHANGE_STATUS_PAYMENT_METHOD_REQUIRED]: 'payment-method-required',
}

// Identity comes from forwardAuth headers - every RPC here is self-service, so no
// user/customer id is ever set on the request itself.
const client = new BillingServiceClient(BILLING_API_BASE, null, null)

function mapError(err: unknown, context: string): never {
  normalizeAndDispatch(err, context, 'billing request failed')
}

export async function getUsage(): Promise<Usage> {
  try {
    const resp = await client.getUsage(new GetUsageRequest(), {})
    return {
      planCode: resp.getPlanCode(),
      planName: resp.getPlanName(),
      tier: TIER_FROM_PROTO[resp.getTier()],
      nextPlanCode: resp.hasNextPlanCode() ? resp.getNextPlanCode() : undefined,
      nextPlanAt: resp.getNextPlanAt()?.toDate().toISOString(),
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

export async function changePlan(planCode: string): Promise<PlanChangeResult> {
  const req = new ChangePlanRequest()
  req.setPlanCode(planCode)

  try {
    const resp = await client.changePlan(req, {})
    const status = PLAN_CHANGE_STATUS_FROM_PROTO[resp.getStatus()]
    if (!status) throw new Error(`unknown plan change status ${resp.getStatus()}`)

    return {
      status,
      actionUrl: resp.hasActionUrl() ? resp.getActionUrl() : undefined,
      effectiveAt: resp.getEffectiveAt()?.toDate().toISOString(),
    }
  } catch (err) {
    mapError(err, 'changePlan')
  }
}

// The one public RPC on this service - callable from the still-unauthenticated
// registration wizard (see access-rules.yml's billing-service-public rule).
export async function getPlans(): Promise<Plan[]> {
  try {
    const resp = await client.getPlans(new GetPlansRequest(), {})
    return resp
      .getPlansList()
      .map((p): Plan | null => {
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
          ...(p.hasIncludedUnits() ? { includedUnits: p.getIncludedUnits() } : {}),
        }
      })
      .filter((p): p is Plan => p !== null)
  } catch (err) {
    mapError(err, 'getPlans')
  }
}
