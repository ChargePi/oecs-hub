import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Skeleton } from '@/components/ui/skeleton'
import { useLegalDocument, type LegalDocumentSlug } from './use-legal-document'

// Full-page long-form prose, unlike chat-message-bubble's compressed chat-bubble map -
// real heading hierarchy and generous paragraph/list spacing instead of everything
// collapsing to one small size.
const LEGAL_MARKDOWN_COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-4 text-xl font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-base font-semibold">{children}</h3>,
  p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-primary"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-muted-foreground">{children}</em>,
}

export function LegalPage({ title, slug }: { title: string; slug: LegalDocumentSlug }) {
  const { data, isLoading, isError } = useLegalDocument(slug)

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">{title}</h1>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          Unable to load this document right now. Please try again later.
        </p>
      ) : (
        <div className="text-sm text-muted-foreground">
          <Markdown remarkPlugins={[remarkGfm]} components={LEGAL_MARKDOWN_COMPONENTS}>
            {data}
          </Markdown>
        </div>
      )}
    </div>
  )
}
