import { useInfiniteQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listInvoices } from '@/lib/billing/client'

const PAGE_SIZE = 20

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amountCents / 100,
  )
}

export function TransactionsSection() {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['billing', 'invoices'],
      queryFn: ({ pageParam }) => listInvoices({ pageSize: PAGE_SIZE, pageToken: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    })

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const invoices = data?.pages.flatMap((page) => page.invoices) ?? []

  if (isError || invoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {isError
            ? "Transaction history isn't available right now."
            : 'No invoices yet.'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">PDF</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>{invoice.number}</TableCell>
              <TableCell>{new Date(invoice.issuedAt).toLocaleDateString()}</TableCell>
              <TableCell className="capitalize">{invoice.status}</TableCell>
              <TableCell className="text-right">
                {formatAmount(invoice.amountCents, invoice.currency)}
              </TableCell>
              <TableCell className="text-right">
                {invoice.pdfUrl ? (
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
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
