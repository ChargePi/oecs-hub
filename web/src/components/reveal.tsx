import type { ReactNode } from 'react'

import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
