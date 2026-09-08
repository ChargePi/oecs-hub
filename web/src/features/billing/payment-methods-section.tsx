import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPaymentPortalUrl } from '@/lib/billing/client'

export function PaymentMethodsSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleManagePaymentMethod() {
    setIsLoading(true)
    setError(null)

    try {
      const url = await getPaymentPortalUrl()
      // New tab, not an iframe - keeps card entry entirely off our origin.
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError("Couldn't open the payment portal. Please try again shortly.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment method</CardTitle>
        <CardDescription>
          Manage your payment method and billing details in our billing provider's secure
          portal. No card details are ever stored on OECS Hub.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={handleManagePaymentMethod} disabled={isLoading} className="self-start">
          {isLoading ? 'Opening…' : 'Manage payment method'}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
