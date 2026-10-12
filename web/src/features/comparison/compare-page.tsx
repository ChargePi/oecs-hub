import { Footer } from '@/components/layout/footer'
import { Skeleton } from '@/components/ui/skeleton'
import { useComparisonVariants } from './use-comparison-variants'
import { ComparisonView, EmptyComparisonState } from './comparison-carousel'

export function ComparePage() {
  const { variants, isLoading } = useComparisonVariants()

  return (
    <div className="flex w-full flex-1 flex-col">
      {!isLoading && variants.length > 0 ? (
        <ComparisonView variants={variants} />
      ) : (
        <div className="flex flex-1 flex-col px-4 py-10 md:px-6">
          {isLoading ? <Skeleton className="h-96 w-full" /> : <EmptyComparisonState />}
        </div>
      )}

      <Footer />
    </div>
  )
}
