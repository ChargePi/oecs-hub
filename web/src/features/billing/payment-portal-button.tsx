import { useState } from 'react'
import { CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { getPaymentPortalUrl } from '@/lib/billing/client'
import { AuthRequiredError, errorSeverity } from '@/lib/errors'
import { toastError } from '@/stores/toast-store'

export function PaymentPortalButton() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
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
    <Button variant="outline" onClick={handleClick} disabled={isLoading}>
      <CreditCard />
      {isLoading ? 'Opening…' : 'Manage payment method'}
    </Button>
  )
}
