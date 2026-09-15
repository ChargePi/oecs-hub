import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { getPaymentPortalUrl } from '@/lib/billing/client'
import { AuthRequiredError, errorSeverity } from '@/lib/errors'
import { toastError } from '@/stores/toast-store'

export function PaymentMethodsSection() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleManagePaymentMethod() {
    setIsLoading(true)

    try {
      const url = await getPaymentPortalUrl()
      // New tab, not an iframe - keeps card entry entirely off our origin.
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin()
        return
      }
      toastError("Couldn't open the payment portal. Please try again shortly.", undefined, errorSeverity(err))
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
      </CardContent>
    </Card>
  )
}
