import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { registryClient } from '@/lib/registry/client'

export function DeleteAccountControl() {
  const [showDialog, setShowDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      await registryClient.deleteAccount()
      // Hard navigate rather than routing client-side: the session is gone server-side,
      // so every bit of cached/local state (query cache, auth context) needs dropping too.
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.')
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>Irreversible account actions.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Permanently delete your account. This can't be undone.
        </p>
        <Button variant="destructive" onClick={() => setShowDialog(true)}>
          Delete account
        </Button>
      </CardContent>

      <AlertDialog open={showDialog} onOpenChange={(open) => !isDeleting && setShowDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account and login credentials will be permanently deleted. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => {
                // confirmDelete controls the dialog's lifetime itself (via the hard
                // navigation on success, or staying open with an error on failure).
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
