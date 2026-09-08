import { useState } from 'react'
import { FlowType } from '@ory/client-fetch'
import type { UiNode } from '@ory/client-fetch'
import {
  Node,
  OryCard,
  OryCardContent,
  OryCardValidationMessages,
  OryForm,
  useOryFlow,
} from '@ory/elements-react'

import { BILLING_ENABLED } from '@/lib/billing/config'
import type { PlanTier } from '@/lib/billing/types'
import type { AccountType } from '@/lib/auth/types'
import { cn } from '@/lib/utils'
import { PlanStep } from './plan-step'
import {
  isCredentialFieldNode,
  isDefaultNode,
  isGeneralInfoTraitNode,
  isOidcNode,
  isSubmitNode,
} from './registration-node-groups'

interface RegistrationWizardProps {
  accountType: AccountType
  onPlanSelect: (code: string, tier: PlanTier) => void
}

type Step = 1 | 2

const STEP_LABELS: Record<Step, string> = {
  1: 'General',
  2: 'Plan',
}

// Never pair native `hidden` with a `display`-setting class like "flex" on one element -
// the author class wins over `[hidden]`, so it'd stay visible. Toggle the class instead.
function stepClassName(active: boolean): string {
  return active ? 'flex flex-col gap-6' : 'hidden'
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
// forth. Billing details are managed in Lago's own portal (PaymentMethodsSection), not
// collected here - the plan step only decides which plan gets subscribed at signup.
export function RegistrationWizard({ accountType, onPlanSelect }: RegistrationWizardProps) {
  const flowContainer = useOryFlow()
  const [step, setStep] = useState<Step>(1)
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null)

  if (flowContainer.flowType !== FlowType.Registration) return null

  const allNodes = flowContainer.flow.ui.nodes
  const defaultNodes = allNodes.filter(isDefaultNode)
  const oidcNodes = allNodes.filter(isOidcNode)
  const generalInfoNodes = allNodes.filter(isGeneralInfoTraitNode)
  const credentialNodes = allNodes.filter(isCredentialFieldNode)
  const submitNodes = allNodes.filter(isSubmitNode)

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
    <OryCard>
      <OryCardContent>
        <OryCardValidationMessages />
        {!skipPlan && (
          <div className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {([1, 2] as Step[]).map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">&rarr;</span>}
                <span className={s === step ? 'text-foreground' : undefined}>{STEP_LABELS[s]}</span>
              </span>
            ))}
          </div>
        )}

        <OryForm>
          {renderNodes(defaultNodes)}

          <div className={stepClassName(step === 1)}>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">General information</h2>
              {renderNodes(generalInfoNodes)}
              {renderNodes(credentialNodes)}
            </div>
            {oidcNodes.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                {renderNodes(oidcNodes)}
              </div>
            )}
            {skipPlan ? (
              renderNodes(submitNodes)
            ) : (
              <button
                type="button"
                onClick={() => setStep(2)}
                className={cn(wizardButtonClassName(true), 'self-start')}
              >
                Next
              </button>
            )}
          </div>

          {!skipPlan && (
            <div className={stepClassName(step === 2)}>
              <h2 className="text-lg font-semibold text-foreground">Choose a plan</h2>
              <PlanStep accountType={accountType} selectedCode={selectedPlanCode} onSelect={handlePlanSelect} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className={wizardButtonClassName(false)}>
                  Back
                </button>
                {renderNodes(submitNodes)}
              </div>
            </div>
          )}
        </OryForm>
      </OryCardContent>
    </OryCard>
  )
}
