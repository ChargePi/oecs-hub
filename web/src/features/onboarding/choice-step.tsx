import { MultiOptionGroup, OptionGroup } from '@/components/option-group'
import type { Question } from '@/lib/onboarding/types'

interface ChoiceStepProps {
  question: Question
  value: string[]
  onChange: (value: string[]) => void
}

export function ChoiceStep({ question, value, onChange }: ChoiceStepProps) {
  const options = question.options.map((o) => ({
    value: o.id,
    label: o.label,
    description: o.description,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance text-foreground">
          {question.title}
        </h2>
        {question.hint && <p className="text-sm text-muted-foreground">{question.hint}</p>}
      </div>
      {question.kind === 'multiple' ? (
        <MultiOptionGroup
          label={question.title}
          className="grid-cols-1"
          options={options}
          value={value}
          onChange={onChange}
        />
      ) : (
        <OptionGroup
          label={question.title}
          className="grid-cols-1"
          options={options}
          value={value[0]}
          onChange={(id) => onChange([id])}
        />
      )}
    </div>
  )
}
