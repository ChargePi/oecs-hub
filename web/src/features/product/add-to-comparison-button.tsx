import { CircleCheckBig, PlusCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChargerVariant } from '@/lib/oecs/types'
import { MAX_COMPARISON_ITEMS, useComparisonStore } from '@/stores/comparison-store'

export function AddToComparisonButton({ variant }: { variant: ChargerVariant }) {
  const inComparison = useComparisonStore((state) => state.has(variant.id))
  const isFull = useComparisonStore((state) => state.variantIds.length >= MAX_COMPARISON_ITEMS)
  const toggle = useComparisonStore((state) => state.toggle)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!inComparison && isFull}
          onClick={() => toggle(variant.id)}
          aria-label={
            inComparison
              ? `Remove ${variant.model.name} from comparison`
              : `Add ${variant.model.name} to comparison`
          }
        >
          {inComparison ? <CircleCheckBig className="text-primary" /> : <PlusCircle />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{inComparison ? 'Remove from comparison' : 'Add to comparison'}</TooltipContent>
    </Tooltip>
  )
}
