import type { ComponentType, ReactNode } from 'react'
import { FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

export function SpecSection({
  title,
  icon: Icon,
  columns = 2,
  children,
}: {
  title: string
  icon?: ComponentType<{ className?: string }>
  /** Number of columns in the spec grid at the sm breakpoint and up. Defaults to 2 (the narrow
   *  product-detail/manufacturer drawer); the wider comparison cards opt into 3. */
  columns?: 2 | 3
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="size-4 text-primary" />}
        {title}
      </h3>
      <div
        className={`grid grid-cols-1 gap-x-6 gap-y-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {children}
      </div>
    </section>
  )
}

export function SpecRow({
  label,
  value,
  wide = false,
  inline = false,
}: {
  label: string
  value?: ReactNode
  /** Spans both grid columns — for values too long to fit a half-width cell without an awkward
   *  mid-word break, like emails and URLs. */
  wide?: boolean
  /** Label and value share a line instead of stacking — for short values like Yes/No. */
  inline?: boolean
}) {
  if (value == null || value === '') return null
  if (inline && wide) {
    return (
      <div className="col-span-full grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-baseline gap-3 border-b border-border/60 py-1.5 text-sm">
        <span className="text-muted-foreground break-words">{label}</span>
        <span className="font-medium break-words">{value}</span>
      </div>
    )
  }
  if (inline) {
    // Not wide, so this row shares a grid cell with siblings — too narrow for the label+value
    // side-by-side split above (long labels would break mid-word), so stack instead, same as
    // the default row below.
    return (
      <div className="flex flex-col gap-0.5 border-b border-border/60 py-1.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium break-words">{value}</span>
      </div>
    )
  }
  return (
    <div
      className={`flex flex-col gap-0.5 border-b border-border/60 py-1.5 text-sm ${wide ? 'col-span-full' : ''}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  )
}

/** Like SpecRow, but for array-valued specs — each item renders as its own badge, not CSV text. */
export function SpecListRow({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="col-span-full flex flex-col gap-1.5 border-b border-border/60 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export interface LinkBadgeItem {
  label: string
  url?: string
}

/** A row of badges, each optionally linking out (e.g. certifications, source documents). */
export function SpecLinkRow({ label, items }: { label: string; items?: LinkBadgeItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="col-span-full flex flex-col gap-1.5 border-b border-border/60 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) =>
          item.url ? (
            <Badge key={i} variant="outline" asChild>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer gap-1 hover:bg-muted"
              >
                <FileText className="size-3" />
                {item.label}
              </a>
            </Badge>
          ) : (
            <Badge key={i} variant="outline">
              {item.label}
            </Badge>
          ),
        )}
      </div>
    </div>
  )
}
