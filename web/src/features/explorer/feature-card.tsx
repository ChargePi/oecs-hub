import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FeatureCardProps = {
  icon: LucideIcon
  title: string
  body: string
  link?: { to: string; label: string }
  className?: string
}

export function FeatureCard({ icon: Icon, title, body, link, className }: FeatureCardProps) {
  const card = (
    <Card
      className={cn(
        'relative h-full rounded-2xl bg-card/60 py-6 shadow-2xl shadow-black/30 backdrop-blur transition-[box-shadow] duration-200 [--card-spacing:--spacing(6)] hover:ring-foreground/20',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-foreground/25 to-transparent"
      />
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </div>
        <CardTitle className="flex-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 text-sm leading-relaxed text-muted-foreground">{body}</CardContent>
      {link && (
        <CardContent className="text-center text-sm font-medium text-primary">{link.label}</CardContent>
      )}
    </Card>
  )

  if (!link) return card
  return (
    <Link
      to={link.to}
      className="group/feature block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </Link>
  )
}
