import { cn } from '@/lib/utils'

export interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

function optionClassName(selected: boolean): string {
  return cn(
    'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60',
    selected
      ? 'border-primary bg-primary/10 text-foreground'
      : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground',
  )
}

export function OptionGroup<T extends string>({
  label,
  options,
  value,
  disabled = false,
  className = 'sm:grid-cols-3',
  onChange,
}: {
  label: string
  options: readonly Option<T>[]
  value: T | undefined
  disabled?: boolean
  className?: string
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={optionClassName(value === option.value)}
        >
          <span className="font-medium">{option.label}</span>
          {option.description && <span className="text-xs">{option.description}</span>}
        </button>
      ))}
    </div>
  )
}

export function MultiOptionGroup<T extends string>({
  label,
  options,
  value,
  disabled = false,
  className = 'sm:grid-cols-3',
  onChange,
}: {
  label: string
  options: readonly Option<T>[]
  value: readonly T[]
  disabled?: boolean
  className?: string
  onChange: (value: T[]) => void
}) {
  return (
    <div role="group" aria-label={label} className={cn('grid gap-2', className)}>
      {options.map((option) => {
        const selected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={disabled}
            onClick={() =>
              onChange(
                selected ? value.filter((v) => v !== option.value) : [...value, option.value],
              )
            }
            className={optionClassName(selected)}
          >
            <span className="font-medium">{option.label}</span>
            {option.description && <span className="text-xs">{option.description}</span>}
          </button>
        )
      })}
    </div>
  )
}
