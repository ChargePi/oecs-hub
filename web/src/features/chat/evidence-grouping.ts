import type { ChargePointCandidate, EvidenceItem } from '@/lib/chat/types'

const CANDIDATE_SOURCE_PREFIX = 'oecs-registry://charger/'

export interface CandidateEvidenceGroup {
  candidate: ChargePointCandidate
  /** Why this charger was selected. The matching candidate_data evidence row's excerpt,
   *  or candidate.reasoning itself if no evidence row references this candidate (the
   *  backend always emits exactly one matching row per candidate today, so this
   *  fallback is defensive, not the common path). */
  reasoning: string
  /** Supporting citations also attributable to this charger. Always empty today -
   *  the only evidence rows carrying a charger-scoped sourceUri are candidate_data rows,
   *  and there's exactly one per candidate, already consumed as `reasoning` above. Kept
   *  as a real field so a future evidence source stamping a charger-scoped URI on a
   *  knowledge_chunk/tool_call row is picked up automatically without a UI change. */
  citations: EvidenceItem[]
}

export interface GroupedEvidence {
  perCandidate: CandidateEvidenceGroup[]
  /** Evidence not attributable to any single charger: knowledge_chunk/tool_call rows
   *  (document/tool URIs, not charger URIs), plus any candidate_data row whose embedded
   *  id doesn't match a candidate currently in `candidates`. */
  general: EvidenceItem[]
}

function candidateIdFromSourceUri(item: EvidenceItem): string | undefined {
  if (item.sourceType !== 'candidate_data') return undefined
  return item.sourceUri.startsWith(CANDIDATE_SOURCE_PREFIX)
    ? item.sourceUri.slice(CANDIDATE_SOURCE_PREFIX.length)
    : undefined
}

/** Groups raw evidence rows per charger for the Items panel's Evidence section. See
 *  CandidateEvidenceGroup/GroupedEvidence field docs for the exact attribution rules. */
export function groupEvidenceByCandidate(
  candidates: ChargePointCandidate[],
  evidence: EvidenceItem[],
): GroupedEvidence {
  const candidateIds = new Set(candidates.map((c) => c.id))
  const matchedByCandidateId = new Map<string, EvidenceItem>()
  const general: EvidenceItem[] = []

  for (const item of evidence) {
    const candidateId = candidateIdFromSourceUri(item)
    if (candidateId && candidateIds.has(candidateId)) {
      if (!matchedByCandidateId.has(candidateId)) matchedByCandidateId.set(candidateId, item)
      else general.push(item)
    } else {
      general.push(item)
    }
  }

  const perCandidate = candidates.map((candidate) => ({
    candidate,
    reasoning: matchedByCandidateId.get(candidate.id)?.excerpt || candidate.reasoning,
    citations: [] as EvidenceItem[],
  }))

  return { perCandidate, general }
}
