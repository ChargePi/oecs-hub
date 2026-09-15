import { useState } from 'react'

import { redirectToLogin } from '@/lib/auth/use-identity'
import { AuthRequiredError, errorSeverity, GENERIC_ERROR_MESSAGE } from '@/lib/errors'
import { toastError } from '@/stores/toast-store'

/** Wraps an action (form submit, delete, save, ...) so any failure surfaces the
 *  same way app-wide: a toast, or a redirect to login when the session died. */
export function useToastAction() {
  const [isPending, setIsPending] = useState(false)

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setIsPending(true)
    try {
      return await fn()
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin()
        return undefined
      }
      toastError(GENERIC_ERROR_MESSAGE, undefined, errorSeverity(err))
      return undefined
    } finally {
      setIsPending(false)
    }
  }

  return { run, isPending }
}
