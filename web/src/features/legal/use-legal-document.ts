import { useQuery } from '@tanstack/react-query'

export type LegalDocumentSlug = 'privacy' | 'terms'

/**
 * Fetches `/legal/{slug}.md` at runtime (see web/public/legal/) rather than bundling the
 * content at build time, mirroring use-suggested-prompts.ts's usePromptTemplates - so the
 * legal text can be edited or volume-mounted without a rebuild.
 */
export function useLegalDocument(slug: LegalDocumentSlug) {
  return useQuery({
    queryKey: ['legal-document', slug],
    queryFn: async () => {
      const res = await fetch(`/legal/${slug}.md`)
      if (!res.ok) throw new Error(`${res.status}`)
      return res.text()
    },
    staleTime: Infinity,
  })
}
