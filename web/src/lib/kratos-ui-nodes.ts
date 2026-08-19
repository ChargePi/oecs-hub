import { UiNodeInputAttributesTypeEnum } from '@ory/client-fetch'
import type { UiNode } from '@ory/client-fetch'
import { isUiNodeInput } from '@ory/elements-react'

// userType is fixed by the identity schema's const (see
// deployments/docker/kratos/identity.schema.json) - manufacturer is the only value it
// will ever accept - so showing it as an editable text field is redundant and invites
// the user to break their own account by typing something else. Reused by both the
// registration form (features/auth/register-page.tsx) and the settings profile section
// (features/account/settings-flow-section.tsx), since Kratos exposes it as an editable
// trait in both flows.
//
// Marking it type "hidden" rather than dropping it from the node list entirely keeps its
// value in the form submission (Kratos's multi-step registration flow uses this exact
// pattern itself to carry traits.email forward as a hidden node once the password step
// is reached) - just without rendering an input the user could edit.
export function hideUserTypeNode(node: UiNode): UiNode {
  if (isUiNodeInput(node) && node.attributes.name === 'traits.userType') {
    return {
      ...node,
      attributes: {
        ...node.attributes,
        type: UiNodeInputAttributesTypeEnum.Hidden,
        value: 'manufacturer',
      },
    }
  }
  return node
}
