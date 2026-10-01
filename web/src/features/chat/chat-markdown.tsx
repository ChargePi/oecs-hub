import type { Components } from 'react-markdown'

// Shared by ChatMessageBubble and ChatMessageList's LiveAssistantBubble -
// split out since mixing a component export with a plain-value export breaks
// react-refresh.
//
// Sparse on purpose - the agent's replies use headings/bold/lists/links, not the
// full CommonMark surface, and this stays a chat bubble rather than growing a
// typography plugin's worth of styling.
export const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-primary"
    >
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>,
  // GFM pipe tables (remarkGfm) - plain react-markdown parses these as inert text
  // otherwise. Wrapped in its own scroll container since a wide table would
  // otherwise force the whole chat bubble wider than its max-width.
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border px-2 py-1 align-top">{children}</td>,
}
