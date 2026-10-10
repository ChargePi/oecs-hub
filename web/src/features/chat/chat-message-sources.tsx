import { FileText } from 'lucide-react'

import type { KnowledgeSource } from '@/lib/chat/types'

/** "chunk 9/30" -> 9, so a document's sections can be listed compactly in order. */
function chunkNumber(section: string): number | undefined {
  const match = /^chunk (\d+)\/\d+$/.exec(section)
  return match ? Number(match[1]) : undefined
}

/** Lists a document's sections, e.g. "sections 1, 9, 10 of 30" for chunk labels,
 *  otherwise the labels as given. */
function formatSections(sections: string[]): string {
  const numbers = sections.map(chunkNumber)
  if (numbers.every((n) => n !== undefined)) {
    const total = /\/(\d+)$/.exec(sections[0])?.[1]
    const sorted = (numbers as number[]).sort((a, b) => a - b).join(', ')
    return `${sections.length === 1 ? 'section' : 'sections'} ${sorted}${total ? ` of ${total}` : ''}`
  }
  return sections.join(', ')
}

/** The knowledge-base documents a reply drew on, under the reply. */
export function ChatMessageSources({ sources }: { sources: KnowledgeSource[] }) {
  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2">
      <p className="text-xs font-medium text-muted-foreground">Sources</p>
      <ul className="flex flex-col gap-1">
        {sources.map((source) => (
          <li
            key={source.sourceUri || source.title}
            className="flex items-start gap-1.5 text-xs text-muted-foreground"
          >
            <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-medium text-foreground">
                {source.title || source.sourceUri}
              </span>
              {source.sections.length > 0 && <span> · {formatSections(source.sections)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
