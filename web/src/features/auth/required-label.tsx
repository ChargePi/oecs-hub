import { isUiNodeInput } from '@ory/elements-react'
import type { OryNodeLabelProps } from '@ory/elements-react'

// Adds a required-field asterisk, which Ory's own default Label doesn't render.
// `children` is the actual input - must be rendered or the field disappears.
export function RequiredLabel({ node, attributes, children }: OryNodeLabelProps) {
  const text = node.meta?.label?.text
  const required = isUiNodeInput(node) && node.attributes.required === true

  return (
    <div className="flex flex-col gap-1">
      {text && (
        <label htmlFor={attributes.name} className="leading-normal text-input-foreground-primary">
          {text}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
    </div>
  )
}
