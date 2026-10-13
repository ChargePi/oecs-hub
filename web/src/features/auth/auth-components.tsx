import { Link } from 'react-router'
import { instanceOfUiText } from '@ory/client-fetch'
import { useComponents, useOryFlow } from '@ory/elements-react'
import type { OryNodeLabelProps } from '@ory/elements-react'
import { DefaultCardFooter, DefaultCurrentIdentifierButton } from '@ory/elements-react/theme'

const LINK_CLASS = 'oecs-auth-link'

// Logo/title/subtitle live in AuthLayout; only the identifier chip (2FA, refresh) stays.
export function AuthCardHeader() {
  return <DefaultCurrentIdentifierButton />
}

export function AuthCardDivider() {
  return (
    <div
      className="oecs-auth-divider flex items-center gap-3 text-xs text-muted-foreground"
      role="separator"
    >
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

// The default footer's "Sign up" link points at Kratos's registration-flow-init endpoint,
// which would create a flow before RegisterPage's account-type picker runs.
export function LoginCardFooter() {
  const { formState } = useOryFlow()
  if (formState.current !== 'provide_identifier') return <DefaultCardFooter />

  return (
    <p className="text-center text-sm text-muted-foreground">
      Don&apos;t have an account?{' '}
      <Link to="/auth/register" className={LINK_CLASS}>
        Sign up
      </Link>
    </p>
  )
}

// `children` is the actual input - must be rendered or the field disappears.
export function LoginLabel({ node, attributes, fieldError, children }: OryNodeLabelProps) {
  const { Message } = useComponents()
  const text = node.meta?.label?.text

  return (
    <div className="flex flex-col gap-1">
      {text && (
        <span className="inline-flex justify-between">
          <label htmlFor={attributes.name} className="leading-normal text-input-foreground-primary">
            {text}
          </label>
          {attributes.type === 'password' && (
            <Link to="/auth/recovery" className={`text-sm ${LINK_CLASS}`}>
              Forgot password?
            </Link>
          )}
        </span>
      )}
      {children}
      {node.messages.map((message) => (
        <Message.Content key={message.id} message={message} />
      ))}
      {fieldError && instanceOfUiText(fieldError) && <Message.Content message={fieldError} />}
    </div>
  )
}
