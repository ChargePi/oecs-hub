import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import { listInvoices } from '@/lib/billing/client'

const PAGE_SIZE = 10

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  finalized: 'success',
  pending: 'warning',
  draft: 'secondary',
  failed: 'destructive',
  voided: 'secondary',
}

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amountCents / 100,
  )
}

export function InvoicesSection({ id }: { id?: string }) {
  // Tokens of every page visited so far; index 0 is the first page.
  const [tokens, setTokens] = useState<(string | undefined)[]>([undefined])
  const page = tokens.length - 1

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['billing', 'invoices', tokens[page]],
    queryFn: () => listInvoices({ pageSize: PAGE_SIZE, pageToken: tokens[page] }),
    placeholderData: keepPreviousData,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.totalSize / PAGE_SIZE)) : 1

  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-lg font-semibold text-foreground">Billing history</h3>
        {data && data.totalSize > 0 && <Badge variant="secondary">{data.totalSize}</Badge>}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError || !data || data.invoices.length === 0 ? (
        <p className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
          {isError ? "Invoices aren't available right now." : 'No invoices yet.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4">Invoice</TableHead>
                <TableHead>Billing date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody className={isFetching ? 'opacity-60' : undefined}>
              {data.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
                        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <span className="font-medium text-foreground">{invoice.number}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(invoice.issuedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[invoice.status] ?? 'secondary'} className="capitalize">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(invoice.amountCents, invoice.currency)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {invoice.pdfUrl && (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Download invoice ${invoice.number}`}
                          title="Download PDF"
                        >
                          <Download />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || isFetching}
                onClick={() => setTokens((t) => t.slice(0, -1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.nextPageToken || isFetching}
                onClick={() => setTokens((t) => [...t, data.nextPageToken])}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
