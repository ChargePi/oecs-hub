import { cn } from '@/lib/utils'

const SEGMENT_Y = [22, 19, 16]

export function ChargerLoader({
  size = 'md',
  label,
  className,
}: {
  size?: 'sm' | 'md'
  label?: string
  className?: string
}) {
  const small = size === 'sm'

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center text-sm text-muted-foreground',
        small ? 'gap-2' : 'flex-col gap-3',
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className={cn('shrink-0', small ? 'size-5' : 'size-14')}
      >
        <rect
          x="5"
          y="3"
          width="15"
          height="24"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <rect x="8" y="6" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M13.2 6.8 10.4 10h2.2l-.8 2.4 2.9-3.3h-2.2z"
          className="oecs-bolt-flash fill-primary"
        />
        {SEGMENT_Y.map((y, i) => (
          <rect
            key={y}
            x="8"
            y={y}
            width="9"
            height="2"
            rx="0.6"
            className="oecs-charge-seg fill-primary"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
        <path
          d="M20 9h2a3 3 0 0 1 3 3v8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="25" cy="22.5" r="1.8" className="oecs-plug-pulse fill-primary" />
        <path d="M3 29h20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      {label ? <span>{label}</span> : <span className="sr-only">Loading…</span>}
    </div>
  )
}
