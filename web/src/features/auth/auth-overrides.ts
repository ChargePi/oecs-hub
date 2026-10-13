import type { OryFlowComponentOverrides } from '@ory/elements-react'

import { AuthCardDivider, AuthCardHeader, LoginCardFooter, LoginLabel } from './auth-components'

export const authComponents: OryFlowComponentOverrides = {
  Card: { Header: AuthCardHeader, Divider: AuthCardDivider },
}

export const loginComponents: OryFlowComponentOverrides = {
  Card: { ...authComponents.Card, Footer: LoginCardFooter },
  Node: { Label: LoginLabel },
}
