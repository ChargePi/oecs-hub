import { UiNodeInputAttributesTypeEnum } from '@ory/client-fetch'
import type { UiNode } from '@ory/client-fetch'
import { isUiNodeInput } from '@ory/elements-react'

export type AccountType = 'manufacturer' | 'individual'

// The two account-specific field groups (traits.company.* for manufacturer,
// traits.billingAddress.* for individual - see
// deployments/docker/kratos/identity.schema.json) - keyed by the *other* type's prefix,
// i.e. the group to hide when a given type is selected.
const OTHER_TYPE_FIELD_PREFIX: Record<AccountType, string> = {
  manufacturer: 'traits.billingAddress.',
  individual: 'traits.company.',
}

// userType is driven by AccountTypeSelector, not free text (see its own comment) - so
// showing it as an editable input is redundant and invites the user to break their own
// account by typing something outside the schema's enum. Reused by both the
// registration form (features/auth/register-page.tsx) and the settings profile section
// (features/account/settings-flow-section.tsx), since Kratos exposes it as an editable
// trait in both flows.
//
// Marking it type "hidden" rather than dropping it from the node list entirely keeps its
// value in the form submission (Kratos's multi-step registration flow uses this exact
// pattern itself to carry traits.email forward as a hidden node once the password step
// is reached) - just without rendering an input the user could edit.
export function hideUserTypeNode(node: UiNode, userType: AccountType): UiNode {
  if (isUiNodeInput(node) && node.attributes.name === 'traits.userType') {
    return {
      ...node,
      attributes: {
        ...node.attributes,
        type: UiNodeInputAttributesTypeEnum.Hidden,
        value: userType,
      },
    }
  }
  return node
}

// Kratos generates a node for every traits property regardless of which if/then branch
// the schema's allOf actually requires for the current userType - so both
// traits.company.* and traits.billingAddress.* are always present in the raw flow.
// Without this, a Manufacturer signup would show billing-address inputs (and vice
// versa) that the schema doesn't even require for that type.
export function filterAccountTypeNodes(nodes: UiNode[], userType: AccountType): UiNode[] {
  const otherPrefix = OTHER_TYPE_FIELD_PREFIX[userType]
  return nodes.filter((node) => !(isUiNodeInput(node) && node.attributes.name.startsWith(otherPrefix)))
}

// Reads the identity's existing traits.userType value off an already-fetched flow (the
// settings flow, where a value is always present - unlike registration, where the
// account type is still being chosen via AccountTypeSelector and isn't on the flow yet).
export function currentAccountType(nodes: UiNode[]): AccountType {
  const node = nodes.find((n) => isUiNodeInput(n) && n.attributes.name === 'traits.userType')
  const value = node && isUiNodeInput(node) ? node.attributes.value : undefined
  return value === 'individual' ? 'individual' : 'manufacturer'
}
