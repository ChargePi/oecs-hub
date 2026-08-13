import { useQueries } from '@tanstack/react-query'

import { registryClient } from '@/lib/registry/client'
import { useComparisonStore } from '@/stores/comparison-store'

/** Resolves the picked variant IDs in the comparison store to their full records. */
export function useComparisonVariants() {
  const variantIds = useComparisonStore((state) => state.variantIds)

  const results = useQueries({
    queries: variantIds.map((id) => ({
      queryKey: ['variant', id],
      queryFn: () => registryClient.getVariant(id),
    })),
  })

  const variants = results.map((r) => r.data).filter((v) => v != null)
  const isLoading = results.some((r) => r.isLoading)

  return { variants, isLoading }
}
