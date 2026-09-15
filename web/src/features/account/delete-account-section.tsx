import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { useLogout } from '@/lib/auth/use-logout'
import { AuthRequiredError, errorSeverity } from '@/lib/errors'
import { registryClient } from '@/lib/registry/client'
import { toastError } from '@/stores/toast-store'

export function DeleteAccountSection() {
  const [isDeleting, setIsDeleting] = useState(false)
  const { logout } = useLogout()

  async function handleConfirm() {
    setIsDeleting(true)

    try {
      await registryClient.deleteAccount()
      // Deleting the identity doesn't revoke the session cookie by itself - logout
      // clears it and redirects, same flow as a normal sign-out.
      await logout()
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin()
        return
      }
      toastError("Couldn't delete your account. Please try again shortly.", undefined, errorSeverity(err))
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="self-start">
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConfirm()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
