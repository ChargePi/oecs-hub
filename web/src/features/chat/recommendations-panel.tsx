import { PanelRightClose, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ChargePointCandidate, EvidenceItem } from '@/lib/chat/types'

function CandidateCard({ candidate }: { candidate: ChargePointCandidate }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{candidate.modelName}</CardTitle>
            <p className="truncate text-xs text-muted-foreground">{candidate.manufacturerName}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {Math.round(candidate.score)}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Zap className="size-3" />
          {candidate.maxPowerKw} kW · {candidate.chargerType}
        </div>
        {candidate.connectorTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {candidate.connectorTypes.map((connector) => (
              <Badge key={connector} variant="secondary">
                {connector}
              </Badge>
            ))}
          </div>
        )}
        {candidate.reasoning && (
          <p className="text-xs text-muted-foreground">{candidate.reasoning}</p>
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

export function RecommendationsPanel({
  candidates,
  evidence,
  onCollapse,
}: {
  candidates: ChargePointCandidate[]
  evidence: EvidenceItem[]
  onCollapse: () => void
}) {
  return (
    <aside className="sticky top-14 flex h-[calc(100svh-3.5rem)] w-80 shrink-0 flex-col border-l border-border bg-card/50">
      <div className="flex items-center gap-2 p-4">
        <h2 className="min-w-0 flex-1 text-sm font-medium">Recommendations</h2>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onCollapse}
          aria-label="Hide recommendations"
        >
          <PanelRightClose />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-3">
        {candidates.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No recommendations yet. Ask a question to get suggested charge points.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {candidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>

            {evidence.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-medium text-muted-foreground uppercase">
                  Evidence
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {evidence.map((item, i) => (
                    <EvidenceRow key={`${item.sourceUri}-${i}`} evidence={item} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
