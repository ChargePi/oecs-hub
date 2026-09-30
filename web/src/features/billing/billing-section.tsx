import { InvoicesSection } from './invoices-section'
import { PaymentPortalButton } from './payment-portal-button'
import { PlanSection } from './plan-section'

const INVOICES_ID = 'billing-invoices'

export function BillingSection() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Billing</h2>
          <p className="text-sm text-muted-foreground">Manage your plan and billing history here.</p>
        </div>
        <PaymentPortalButton />
      </div>

      <PlanSection
        onShowInvoices={() =>
          document.getElementById(INVOICES_ID)?.scrollIntoView({ behavior: 'smooth' })
        }
      />

      <InvoicesSection id={INVOICES_ID} />
    </div>
  )
}
