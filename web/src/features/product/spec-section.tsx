import type { ComponentType, ReactNode } from 'react'
import { FileText, Info } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Wraps a row label with an info-icon tooltip explaining what the field means. Renders the
 *  label plain when no description is given, so this stays a no-op for unwired rows. */
function FieldLabel({ label, description }: { label: string; description?: string }) {
  if (!description) return <>{label}</>
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger className="cursor-help text-muted-foreground/70 hover:text-foreground">
          <Info className="size-3" />
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </span>
  )
}

/** Wraps a rendered *value* (a badge, a piece of text) with a tooltip explaining what that
 *  specific value means — e.g. what "CCS2_Combo2" or "OCPP" is. Renders `children` plain when no
 *  description is given. Uses a dotted-underline affordance rather than FieldLabel's icon, since
 *  this wraps dense, often-repeated badge rows where an icon per item would be noisy. */
export function ValueTooltip({
  description,
  children,
}: {
  description?: string
  children: ReactNode
}) {
  if (!description) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  )
}

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
  description,
  valueDescription,
}: {
  label: string
  value?: ReactNode
  /** Spans both grid columns — for values too long to fit a half-width cell without an awkward
   *  mid-word break, like emails and URLs. */
  wide?: boolean
  /** Label and value share a line instead of stacking — for short values like Yes/No. */
  inline?: boolean
  /** Tooltip explaining what this field means, shown as an info icon next to the label. */
  description?: string
  /** Tooltip explaining what this specific value means, e.g. an enum value like "DC". */
  valueDescription?: string
}) {
  if (value == null || value === '') return null
  const valueNode = <ValueTooltip description={valueDescription}>{value}</ValueTooltip>
  if (inline && wide) {
    return (
      <div className="col-span-full grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-baseline gap-3 border-b border-border/60 py-1.5 text-sm">
        <span className="text-muted-foreground break-words">
          <FieldLabel label={label} description={description} />
        </span>
        <span className="font-medium break-words">{valueNode}</span>
      </div>
    )
  }
  if (inline) {
    // Not wide, so this row shares a grid cell with siblings — too narrow for the label+value
    // side-by-side split above (long labels would break mid-word), so stack instead, same as
    // the default row below.
    return (
      <div className="flex flex-col gap-0.5 border-b border-border/60 py-1.5 text-sm">
        <span className="text-muted-foreground">
          <FieldLabel label={label} description={description} />
        </span>
        <span className="font-medium break-words">{valueNode}</span>
      </div>
    )
  }
  return (
    <div
      className={`flex flex-col gap-0.5 border-b border-border/60 py-1.5 text-sm ${wide ? 'col-span-full' : ''}`}
    >
      <span className="text-muted-foreground">
        <FieldLabel label={label} description={description} />
      </span>
      <span className="font-medium break-words">{valueNode}</span>
    </div>
  )
}

export interface SpecListItem {
  text: string
  /** Tooltip explaining what this specific item value means, e.g. an enum value like "OCPP". */
  description?: string
}

/** Like SpecRow, but for array-valued specs — each item renders as its own badge, not CSV text. */
export function SpecListRow({
  label,
  items,
  description,
}: {
  label: string
  items?: SpecListItem[]
  description?: string
}) {
  if (!items || items.length === 0) return null
  return (
    <div className="col-span-full flex flex-col gap-1.5 border-b border-border/60 py-1.5 text-sm">
      <span className="text-muted-foreground">
        <FieldLabel label={label} description={description} />
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <ValueTooltip key={item.text} description={item.description}>
            <Badge variant="secondary">{item.text}</Badge>
          </ValueTooltip>
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
export function SpecLinkRow({
  label,
  items,
  description,
}: {
  label: string
  items?: LinkBadgeItem[]
  description?: string
}) {
  if (!items || items.length === 0) return null
  return (
    <div className="col-span-full flex flex-col gap-1.5 border-b border-border/60 py-1.5 text-sm">
      <span className="text-muted-foreground">
        <FieldLabel label={label} description={description} />
      </span>
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
