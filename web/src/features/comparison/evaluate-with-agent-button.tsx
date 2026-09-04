import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CHAT_ENABLED } from '@/lib/chat/config'
import type { ChargerVariant } from '@/lib/oecs/types'

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

/** Starts a new agent chat pre-loaded with a comparison prompt for the currently compared
 *  chargers, via the same `/chat?prompt=` handoff ChatDashboardPage auto-sends on landing.
 *  Also carries the exact catalog ids (`chargerIds`) so the agent's ResolveChargers can
 *  skip its name-based resolution loop entirely - the prompt text still names every
 *  charger too, for AnalyzeIntent's own compare_chargers classification. */
export function EvaluateWithAgentButton({ variants }: { variants: ChargerVariant[] }) {
  const navigate = useNavigate()

  if (!CHAT_ENABLED || variants.length < 2) return null

  function handleClick() {
    const prompt = buildComparisonPrompt(variants)
    const chargerIds = variants.map((v) => v.id).join(',')
    navigate(`/chat?prompt=${encodeURIComponent(prompt)}&chargerIds=${encodeURIComponent(chargerIds)}`)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleClick}>
          <Sparkles />
          Evaluate using AI
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Starts a new agent chat, asking it to compare these {variants.length} chargers.
      </TooltipContent>
    </Tooltip>
  )
}
