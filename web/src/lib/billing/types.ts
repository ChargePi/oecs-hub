export interface UsageMetric {
  code: string
  name: string
  consumedUnits: number
  // The plan's free allowance for this metric, if any (e.g. absent on a paid,
  // pay-per-use plan).
  includedUnits?: number
}

export interface Usage {
  planName: string
  tier?: PlanTier
  metrics: UsageMetric[]
  periodStart: string
  periodEnd: string
}

export interface Invoice {
  id: string
  number: string
  status: string
  amountCents: number
  currency: string
  issuedAt: string
  pdfUrl?: string
}

export interface InvoicesPage {
  invoices: Invoice[]
  nextPageToken: string
  totalSize: number
}

export type PlanAccountType = 'individual' | 'manufacturer'
export type PlanTier = 'free' | 'paid'

export interface Plan {
  code: string
  displayName: string
  amountCents: number
  currency: string
  interval: string
  accountType: PlanAccountType
  tier: PlanTier
  // The plan's free monthly allowance, absent if it has none (e.g. a paid,
  // pay-per-use plan).
  includedUnits?: number
}
