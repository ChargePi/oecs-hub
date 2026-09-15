import { useState } from 'react'
import { FlowType } from '@ory/client-fetch'
import type { UiNode } from '@ory/client-fetch'
import { Node, OryCard, OryCardValidationMessages, OryForm, useOryFlow } from '@ory/elements-react'

import { BILLING_ENABLED } from '@/lib/billing/config'
import type { PlanTier } from '@/lib/billing/types'
import type { AccountType } from '@/lib/auth/types'
import { cn } from '@/lib/utils'
import { PlanStep } from './plan-step'
import {
  isBillingDetailsTraitNode,
  isCredentialFieldNode,
  isDefaultNode,
  isGeneralInfoTraitNode,
  isOidcNode,
  isSubmitNode,
} from './registration-node-groups'

type Step = 1 | 2

interface RegistrationWizardProps {
  accountType: AccountType
  onPlanSelect: (code: string, tier: PlanTier) => void
  // Controlled by register-page.tsx (1 = General info, 2 = Plan), which folds this into
  // the overall Account type/General info/Plan/Billing breadcrumb and keeps this whole
  // tree mounted (CSS-hidden) rather than unmounting it when stepping back to Account
  // type - this component has no idea it's step 2-3 of a larger sequence.
  step: Step
  onStepChange: (step: Step) => void
}

// Never pair native `hidden` with a `display`-setting class like "flex" on one element -
// the author class wins over `[hidden]`, so it'd stay visible. Toggle the class instead.
function stepClassName(active: boolean): string {
  return active ? 'flex flex-col gap-8' : 'hidden'
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}

// Matches Ory Elements' own button styling so Next/Back look identical to the flow's
// own submit button (theme/default/components/form/button.tsx).
const oryButtonBase =
  'group relative flex cursor-pointer justify-center gap-3 overflow-hidden rounded-buttons p-4 leading-none font-medium ring-1 ring-inset transition-colors duration-100 ease-linear disabled:cursor-not-allowed'

function wizardButtonClassName(primary: boolean): string {
  return cn(
    oryButtonBase,
    primary
      ? 'bg-button-primary-background-default text-button-primary-foreground-default ring-button-primary-border-default hover:bg-button-primary-background-hover hover:text-button-primary-foreground-hover hover:ring-button-primary-border-hover disabled:bg-button-primary-background-disabled disabled:text-button-primary-foreground-disabled disabled:ring-button-primary-border-disabled'
      : 'bg-button-secondary-background-default text-button-secondary-foreground-default ring-button-secondary-border-default hover:bg-button-secondary-background-hover hover:text-button-secondary-foreground-hover hover:ring-button-secondary-border-hover disabled:bg-button-secondary-background-disabled disabled:text-button-secondary-foreground-disabled disabled:ring-button-secondary-border-disabled',
  )
}

// <Registration>'s prebuilt card renders every node flat in one form - splitting it into
// steps means providing our own children instead, all inside one <OryForm>. Every node
// stays mounted, only CSS-hidden per step, so field values survive stepping back and
// forth. Card/payment details are managed in Lago's own portal (PaymentMethodsSection),
// not collected here - the plan step only decides which plan gets subscribed at signup.
// The schema's own company/billing-address traits ARE collected here though - they're
// identity data, not payment data (traits.company.name is what SubmitChargerSpec
// attributes a submission to, see internal/grpc/handler.go), and settings-flow-section.tsx
// deliberately excludes them from Profile (isBillingDetailsTraitNode), so this is the only
// place a user can ever set them.
export function RegistrationWizard({
  accountType,
  onPlanSelect,
  step,
  onStepChange,
}: RegistrationWizardProps) {
  const flowContainer = useOryFlow()
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null)

  if (flowContainer.flowType !== FlowType.Registration) return null

  const allNodes = flowContainer.flow.ui.nodes
  const defaultNodes = allNodes.filter(isDefaultNode)
  const oidcNodes = allNodes.filter(isOidcNode)
  const generalInfoNodes = allNodes.filter(isGeneralInfoTraitNode)
  const billingDetailNodes = allNodes.filter(isBillingDetailsTraitNode)
  const credentialNodes = allNodes.filter(isCredentialFieldNode)
  const submitNodes = allNodes.filter(isSubmitNode)

  // "Mailing address", not "Billing address": the breadcrumb already has a "Billing"
  // step (payment/Lago portal, register-complete-page.tsx) - reusing the word here for
  // an unrelated mailing address is exactly the duplication that got flagged.
  const billingDetailsLabel = accountType === 'manufacturer' ? 'Company details' : 'Mailing address'

  const skipPlan = !BILLING_ENABLED

  function renderNodes(nodes: UiNode[]) {
    return (
      <div className="flex flex-col gap-4">
        {nodes.map((node, i) => (
          <Node key={i} node={node} />
        ))}
      </div>
    )
  }

  function handlePlanSelect(code: string, tier: PlanTier) {
    setSelectedPlanCode(code)
    onPlanSelect(code, tier)
  }

  return (
    // OryCard is still needed - not for its box styling (that's overridden away via
    // components.Card.Root in register-page.tsx, see the comment there for why), but
    // because it's what wires up OryFormProvider (react-hook-form context) that <Node>/
    // <OryForm> need - removing it entirely crashes with "Cannot destructure property
    // 'setValue' of null" (confirmed empirically). The div supplies the layout OryCard's
    // own (now-bypassed) padding/gap would otherwise have provided.
    <OryCard>
      <div className="flex flex-col gap-6">
        <OryCardValidationMessages />

        <OryForm>
          {renderNodes(defaultNodes)}

          <div className={stepClassName(step === 1)}>
            {oidcNodes.length > 0 && (
              <>
                <div className="flex flex-col gap-3">{renderNodes(oidcNodes)}</div>
                <OrDivider />
              </>
            )}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">General information</h2>
              {renderNodes(generalInfoNodes)}
              {renderNodes(credentialNodes)}
            </div>
            {billingDetailNodes.length > 0 && (
              <div className="border-t border-border/60 pt-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">{billingDetailsLabel}</h2>
                {renderNodes(billingDetailNodes)}
              </div>
            )}
            {skipPlan ? (
              renderNodes(submitNodes)
            ) : (
              <button
                type="button"
                onClick={() => onStepChange(2)}
                className={cn(wizardButtonClassName(true), 'self-center')}
              >
                Next
              </button>
            )}
          </div>

          {!skipPlan && (
            <div className={stepClassName(step === 2)}>
              <h2 className="text-center text-xl font-semibold text-foreground">Choose a plan</h2>
              <PlanStep accountType={accountType} selectedCode={selectedPlanCode} onSelect={handlePlanSelect} />
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onStepChange(1)}
                  className={wizardButtonClassName(false)}
                >
                  Back
                </button>
                {renderNodes(submitNodes)}
              </div>
            </div>
          )}
        </OryForm>
      </div>
    </OryCard>
  )
}
