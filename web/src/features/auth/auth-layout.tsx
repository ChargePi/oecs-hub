import type { PropsWithChildren } from 'react'
import { Zap } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AuthLayoutProps extends PropsWithChildren {
  title: string
  // Login methods side by side from md up (see .oecs-auth-split in index.css).
  split?: boolean
}

export function AuthLayout({ title, split, children }: AuthLayoutProps) {
  return (
    <div
      className={cn(
        'm-auto flex w-full flex-col gap-6 px-4 py-8',
        split ? 'max-w-md md:max-w-3xl' : 'max-w-md',
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Zap className="size-6 text-primary" aria-hidden="true" />
        <h1 className="text-center text-lg font-semibold">{title}</h1>
      </div>
      <div className={cn('oecs-auth-unboxed flex flex-col gap-4', split && 'oecs-auth-split')}>
        {children}
      </div>
    </div>
  )
}

export function AuthFormSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6" aria-busy="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
