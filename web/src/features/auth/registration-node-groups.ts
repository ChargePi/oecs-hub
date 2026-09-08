import { UiNodeGroupEnum } from '@ory/client-fetch'
import type { UiNode } from '@ory/client-fetch'
import { isUiNodeInput } from '@ory/elements-react'

function traitName(node: UiNode): string | undefined {
  return isUiNodeInput(node) ? node.attributes.name : undefined
}

// Group "default" here also contains every trait field, not just csrf_token (unlike a
// Settings flow) - match by name so only the actual hidden token renders unconditionally.
export function isDefaultNode(node: UiNode): boolean {
  return traitName(node) === 'csrf_token'
}

export function isOidcNode(node: UiNode): boolean {
  return node.group === UiNodeGroupEnum.Oidc
}

// "method" submits the flow; "screen"/"previous" only appears if Kratos ever falls back
// to its multi-step credential-chooser UI.
export function isSubmitNode(node: UiNode): boolean {
  const name = traitName(node)
  return name === 'method' || name === 'screen'
}

export function isCredentialFieldNode(node: UiNode): boolean {
  return node.group === UiNodeGroupEnum.Password && !isSubmitNode(node)
}

export function isGeneralInfoTraitNode(node: UiNode): boolean {
  const name = traitName(node)
  return name === 'traits.email' || name === 'traits.name'
}

export function isBillingDetailsTraitNode(node: UiNode): boolean {
  const name = traitName(node)
  return !!name && (name.startsWith('traits.billingAddress') || name.startsWith('traits.company'))
}
