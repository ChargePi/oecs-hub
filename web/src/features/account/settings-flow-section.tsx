import { Fragment } from 'react'
import { FlowType, UiNodeGroupEnum } from '@ory/client-fetch'
import type { UiNode } from '@ory/client-fetch'
import {
  Node,
  OryCard,
  OryCardContent,
  OryCardValidationMessages,
  OryFormGroupDivider,
  OrySettingsFormSection,
  useOryFlow,
} from '@ory/elements-react'

import { currentAccountType, filterAccountTypeNodes, hideUserTypeNode } from '@/lib/kratos-ui-nodes'
import type { AccountSection } from './settings-node-groups'

// Kratos bundles profile/password/totp/webauthn/oidc into one settings flow, but the
// header dropdown wants two separate entries (Settings, Security). Rendering the same
// fetched flow filtered by node group - rather than two separate flows - keeps the
// underlying form submission semantics exactly as Kratos expects.
//
// Each method group (password, totp, ...) is Kratos's own separately-submittable form -
// submitting "change password" must not also send TOTP fields - so each present group
// gets its own <OrySettingsFormSection>, not one section with every node mixed together.
// The "default" group (just csrf_token) isn't a visible setting, but every per-group form
// still needs it, so it's merged into each section rather than requiring callers to
// remember to ask for it.
//
// OrySettingsFormSection's `nodes` prop does NOT render the nodes itself (confirmed
// empirically - passing only `nodes` renders an empty section); nodes must be rendered
// explicitly as children via <Node>, which is also what the library's own docs say to do
// ("make sure to use this component instead of the custom component directly").
//
// The default OrySettingsCard puts an <OryFormGroupDivider> between each method-group
// section (that's its whole purpose - a group divider); hand-composing sections here
// skipped it, leaving adjacent forms (e.g. Password's Save button, then straight into
// the TOTP QR code) with no visual separation at all. The divider is a flex sibling of
// the sections (not nested inside one), so the gap-8 on the wrapper applies evenly on
// both sides of it - nesting it inside the following section's own wrapper div gave it
// a full gap above (from the previous section) but none below (glued to its own
// section's fields), a lopsided look confirmed against a real render.
//
// OrySettingsFormSection's rendered <form> carries layout classes (flex flex-col
// px-4 ...) but no gap - confirmed via computed styles, and unlike the *pre-built*
// Login/Registration pages (a different component, OryForm, internally "grid gap-8"),
// nothing here spaces the field and its Save button apart on its own. Passing
// className="gap-4" directly to OrySettingsFormSection (it accepts one - OrySettingsFormProps
// extends form props) looked like the obvious fix, but broke the submit buttons' width
// instead (they collapsed to their intrinsic content width) - whatever internal className
// merge it does isn't a safe additive one. Wrapping the <Node> children in a plain div
// with the gap instead leaves OrySettingsFormSection itself untouched.
// Renders every section (Profile, Security, ...) in one OryCard - calling SettingsFlowSection
// per section used to mean one full card each, each repeating the same Ory-generated header
// ("OECS Hub" / "Account Settings"). No <OryCardHeader/> here at all: profile-page.tsx renders
// its own page heading instead, matching every other page's title/subtitle convention rather
// than Ory's own auth-card branding text - <OryCard> is still needed (it's what provides
// OryFormProvider), just without the header.
export function SettingsFlowSection({ sections }: { sections: readonly AccountSection[] }) {
  const flowContainer = useOryFlow()
  if (flowContainer.flowType !== FlowType.Settings) return null

  const allNodes = flowContainer.flow.ui.nodes
  const defaultNodes = allNodes.filter((node) => node.group === UiNodeGroupEnum.Default)
  // Read before hiding: this identity's existing account type, so the group that
  // doesn't apply to it (company.* for an individual, billingAddress.* for a
  // manufacturer) stays hidden here too - see kratos-ui-nodes.ts.
  const accountType = currentAccountType(allNodes)

  const presentSections = sections
    .map((section) => ({
      ...section,
      groups: section.groups.filter((group) => allNodes.some((node) => node.group === group)),
    }))
    .filter((section) => section.groups.length > 0)

  return (
    <OryCard>
      <OryCardContent>
        <OryCardValidationMessages />
        <div className="flex flex-col gap-10">
          {presentSections.map((section, si) => (
            // Fragment, not a wrapping div: the divider must be a direct flex child of
            // the gap-10 container, a sibling of the section rather than nested inside it -
            // same reasoning as the per-group dividers below, one level up.
            <Fragment key={section.title}>
              {si > 0 && <OryFormGroupDivider />}
              <div className="flex flex-col gap-8">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                {section.groups.map((group, i) => {
                  const nodes: UiNode[] = filterAccountTypeNodes(
                    [...defaultNodes, ...allNodes.filter((node) => node.group === group)],
                    accountType,
                  ).map((node) => hideUserTypeNode(node, accountType))
                  return (
                    // Fragment, not a wrapping div: the divider must be a direct flex child
                    // of the gap-8 container, a sibling of the section rather than nested
                    // inside it.
                    <Fragment key={group}>
                      {i > 0 && <OryFormGroupDivider />}
                      <OrySettingsFormSection nodes={nodes}>
                        <div className="flex flex-col gap-4">
                          {nodes.map((node, j) => (
                            // UiNodes have no stable id; index is fine, this list only
                            // reorders on a full flow refetch, which remounts this
                            // component tree anyway.
                            <Node key={j} node={node} />
                          ))}
                        </div>
                      </OrySettingsFormSection>
                    </Fragment>
                  )
                })}
              </div>
            </Fragment>
          ))}
        </div>
      </OryCardContent>
    </OryCard>
  )
}
