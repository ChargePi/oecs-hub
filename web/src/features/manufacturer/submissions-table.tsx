import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { VariantProps } from 'class-variance-authority'

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
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { AuthRequiredError } from '@/lib/errors'
import { cancelSubmission, getManufacturerChargers } from '@/lib/manufacturer/client'
import type { ManufacturerCharger } from '@/lib/manufacturer/types'
import type { SubmissionStatus } from '@/lib/registry/types'
import { useToastAction } from '@/lib/use-toast-action'

const PAGE_SIZE = 20

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_BADGE: Record<SubmissionStatus, { label: string; variant: BadgeVariant }> = {
  unspecified: { label: 'Unknown', variant: 'outline' },
  submitted: { label: 'Submitted', variant: 'secondary' },
  verified: { label: 'Verified', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export function SubmissionsTable({ onEdit }: { onEdit: (charger: ManufacturerCharger) => void }) {
  const queryClient = useQueryClient()
  const { run } = useToastAction()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['manufacturer', 'chargers'],
      queryFn: ({ pageParam }) =>
        getManufacturerChargers({ pageSize: PAGE_SIZE, pageToken: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    })

  // RequireManufacturer only guards the initial route entry off a cached identity, so a
  // session that dies after that (expiry, logout elsewhere) still reaches this query - send
  // the user back to login instead of leaving them on a permanently empty table.
  useEffect(() => {
    if (error instanceof AuthRequiredError) redirectToLogin()
  }, [error])

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const chargers = data?.pages.flatMap((page) => page.chargers) ?? []

  async function handleCancel(id: string) {
    setPendingId(id)
    const result = await run(() => cancelSubmission(id))
    if (result !== undefined) {
      await queryClient.invalidateQueries({ queryKey: ['manufacturer', 'chargers'] })
    }
    setPendingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isError || chargers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                {isError
                  ? "Submissions aren't available right now."
                  : "You haven't submitted any charger specs yet."}
              </TableCell>
            </TableRow>
          ) : (
            chargers.map((charger) => {
              const badge = STATUS_BADGE[charger.status]
              const canManage = charger.status === 'submitted'
              const isPending = pendingId === charger.id

              return (
                <TableRow key={charger.id}>
                  <TableCell>{charger.modelName}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell>{new Date(charger.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => onEdit(charger)}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isPending}>
                              {isPending ? 'Aborting…' : 'Abort'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Abort this submission?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This withdraws "{charger.modelName}" from review. This can't be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep submission</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleCancel(charger.id)}
                              >
                                Abort submission
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}
