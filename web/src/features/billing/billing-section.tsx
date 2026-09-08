import { useState } from 'react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PaymentMethodsSection } from './payment-methods-section'
import { TransactionsSection } from './transactions-section'
import { UsageSection } from './usage-section'

type BillingTab = 'usage' | 'transactions' | 'payment-methods'

// Rendered as a Profile page segment, not its own route - a horizontal Tabs row
// rather than another vertical sidebar, since Profile already owns that level.
export function BillingSection() {
  const [tab, setTab] = useState<BillingTab>('usage')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">Billing</h2>
        <p className="text-sm text-muted-foreground">
          View your usage, past invoices, and manage your payment method.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(next) => setTab(next as BillingTab)}>
        <TabsList>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment method</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'usage' ? <UsageSection /> : null}
      {tab === 'transactions' ? <TransactionsSection /> : null}
      {tab === 'payment-methods' ? <PaymentMethodsSection /> : null}
    </div>
  )
}
