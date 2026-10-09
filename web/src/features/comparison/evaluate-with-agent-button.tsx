import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIdentity } from '@/lib/auth/use-identity'
import { CHAT_ENABLED } from '@/lib/chat/config'
import type { ChargerVariant } from '@/lib/oecs/types'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

function chargerLabel(variant: ChargerVariant): string {
  return `${variant.manufacturer.name} ${variant.model.name}`
}

function joinNames(names: string[]): string {
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  const last = names[names.length - 1]
  return `${names.slice(0, -1).join(', ')}, and ${last}`
}

/** Kept as a bare "compare these" rather than asking a question outright - the agent's
 *  own clarification/follow-up step is where "based on what" gets asked, once that's
 *  exposed here. Assumes at least two variants - callers only render this button once
 *  the comparison has that many. */
function buildComparisonPrompt(variants: ChargerVariant[]): string {
  const names = variants.map(chargerLabel)
  return `Compare chargers: ${joinNames(names)}.`
}

/** Starts a new agent chat in the assistant drawer, pre-loaded with a comparison prompt
 *  for the currently compared chargers. Signed out, it goes through the `/chat?prompt=`
 *  handoff instead (see ChatRedirect), which survives the detour through login and
 *  lands back here. Also carries the exact catalog ids (`chargerIds`) so the agent's ResolveChargers can
 *  skip its name-based resolution loop entirely - the prompt text still names every
 *  charger too, for AnalyzeIntent's own compare_chargers classification. */
export function EvaluateWithAgentButton({
  variants,
  className,
}: {
  variants: ChargerVariant[]
  className?: string
}) {
  const navigate = useNavigate()
  const { identity } = useIdentity()

  if (!CHAT_ENABLED || variants.length < 2) return null

  function handleClick() {
    const prompt = buildComparisonPrompt(variants)
    const chargerIds = variants.map((v) => v.id)
    if (identity) {
      useChatDrawerStore.getState().ask(prompt, chargerIds)
      return
    }
    const params = new URLSearchParams({
      prompt,
      chargerIds: chargerIds.join(','),
      from: window.location.pathname + window.location.search,
    })
    navigate(`/chat?${params}`)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className={className} onClick={handleClick}>
          <Sparkles />
          Evaluate using AI
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Opens the assistant, asking it to compare these {variants.length} chargers.
      </TooltipContent>
    </Tooltip>
  )
}
