import { useState } from 'react'
import { PanelRightClose, Zap } from 'lucide-react'

import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { humanize } from '@/lib/oecs/format'
import type { ChargePointCandidate, EvidenceItem } from '@/lib/chat/types'
import { groupEvidenceByCandidate, type CandidateEvidenceGroup } from './evidence-grouping'
import { ItemDetailSheet } from './item-detail-sheet'

type ScoreVariant = Extract<
  NonNullable<Parameters<typeof badgeVariants>[0]>['variant'],
  'success' | 'warning' | 'destructive'
>

function scoreVariant(score: number): ScoreVariant {
  if (score >= 85) return 'success'
  if (score >= 65) return 'warning'
  return 'destructive'
}

function ScorePill({ score }: { score: number }) {
  return (
    <Badge variant={scoreVariant(score)} className="shrink-0">
      {Math.round(score)}/100
    </Badge>
  )
}

function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: ChargePointCandidate
  onClick: () => void
}) {
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="cursor-pointer transition-colors hover:bg-muted/40"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="min-w-0 truncate">
            <span className="text-muted-foreground">{candidate.manufacturerName}</span>{' '}
            {candidate.modelName}
          </CardTitle>
          <ScorePill score={candidate.score} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Zap className="size-3" />
          {candidate.maxPowerKw} kW · {humanize(candidate.chargerType)}
        </div>
        {candidate.connectorTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {candidate.connectorTypes.map((connector) => (
              <Badge key={connector} variant="secondary">
                {humanize(connector)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EvidenceRow({ evidence }: { evidence: EvidenceItem }) {
  return (
    <li className="rounded-md border border-border bg-card p-2 text-xs">
      {evidence.section && <p className="font-medium">{evidence.section}</p>}
      <p className="mt-0.5 text-muted-foreground">{evidence.excerpt}</p>
    </li>
  )
}

function CandidateEvidenceBlock({ group }: { group: CandidateEvidenceGroup }) {
  if (!group.reasoning.trim() && group.citations.length === 0) return null
  return (
    <li className="rounded-md border border-border bg-card p-2.5 text-xs">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate font-medium">
          {group.candidate.manufacturerName} {group.candidate.modelName}
        </span>
        <ScorePill score={group.candidate.score} />
      </div>
      {group.reasoning.trim() && <p className="text-muted-foreground">{group.reasoning}</p>}
      {group.citations.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-border pl-2">
          {group.citations.map((item, i) => (
            <EvidenceRow key={`${item.sourceUri}-${i}`} evidence={item} />
          ))}
        </ul>
      )}
    </li>
  )
}

function EvidenceSection({
  candidates,
  evidence,
}: {
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
}) {
  const grouped = groupEvidenceByCandidate(candidates, evidence)
  const candidateBlocks = grouped.perCandidate.filter(
    (g) => g.reasoning.trim() || g.citations.length > 0,
  )
  if (candidateBlocks.length === 0 && grouped.general.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-1 text-xs font-medium text-muted-foreground uppercase">Evidence</h3>
      {candidateBlocks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {candidateBlocks.map((g) => (
            <CandidateEvidenceBlock key={g.candidate.id} group={g} />
          ))}
        </ul>
      )}
      {grouped.general.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="px-1 text-[11px] font-medium text-muted-foreground/80 uppercase">
            Supporting sources
          </h4>
          <ul className="flex flex-col gap-1.5">
            {grouped.general.map((item, i) => (
              <EvidenceRow key={`${item.sourceUri}-${i}`} evidence={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ItemsPanel({
  candidates,
  evidence,
  onCollapse,
}: {
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
  onCollapse: () => void
}) {
  const [selectedCandidate, setSelectedCandidate] = useState<ChargePointCandidate | null>(null)

  return (
    <aside className="sticky top-14 flex h-[calc(100svh-3.5rem)] w-80 shrink-0 flex-col border-l border-border bg-card/50">
      <div className="flex items-center gap-2 p-4">
        <h2 className="min-w-0 flex-1 text-sm font-medium">Items</h2>
        <Button size="icon-sm" variant="ghost" onClick={onCollapse} aria-label="Hide items">
          <PanelRightClose />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-3">
        {candidates.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No items yet. Ask a question to get suggested charge points.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onClick={() => setSelectedCandidate(candidate)}
                />
              ))}
            </div>

            <EvidenceSection candidates={candidates} evidence={evidence} />
          </div>
        )}
      </div>

      <ItemDetailSheet candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
    </aside>
  )
}
