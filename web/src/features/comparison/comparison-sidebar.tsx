import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, GitCompare, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { MAX_COMPARISON_ITEMS, useComparisonStore } from '@/stores/comparison-store'
import { ProductImage } from '@/features/product/product-image'
import { useComparisonVariants } from './use-comparison-variants'

export function ComparisonSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { variants } = useComparisonVariants()
  const remove = useComparisonStore((state) => state.remove)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed top-20 right-4 z-20 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm shadow-lg transition-colors hover:bg-muted"
      >
        <GitCompare className="size-4 text-primary" />
        {variants.length > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {variants.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside className="sticky top-14 flex h-[calc(100svh-3.5rem)] w-72 shrink-0 flex-col border-l border-border bg-card/50">
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <GitCompare className="size-4 text-primary" />
          <h2 className="text-sm font-medium">
            Comparison ({variants.length}/{MAX_COMPARISON_ITEMS})
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-3">
        {variants.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            Click a variant in the graph and add it here to start comparing.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {variants.map((variant) => (
              <li
                key={variant.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5"
              >
                <Link
                  to={`/explore/${variant.manufacturer.id}?variant=${variant.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:text-primary"
                >
                  <ProductImage
                    src={variant.model.productImageUrl}
                    alt={variant.model.name}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{variant.model.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {variant.manufacturer.name}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(variant.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${variant.model.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-3">
        <Button asChild className={cn('w-full')} disabled={variants.length === 0}>
          <Link
            to="/compare"
            aria-disabled={variants.length === 0}
            onClick={(e) => variants.length === 0 && e.preventDefault()}
          >
            Compare {variants.length > 0 && `(${variants.length})`}
          </Link>
        </Button>
      </div>
    </aside>
  )
}
