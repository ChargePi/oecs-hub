import { Sparkles } from 'lucide-react'

import { ChatComposer } from './chat-composer'
import { useSuggestedPrompts } from './use-suggested-prompts'

export function ChatEmptyState({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void
  disabled?: boolean
}) {
  const suggestedPrompts = useSuggestedPrompts()

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-semibold">Start a new conversation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask me anything about the chargers, get a recommendation for your use case.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSend(prompt)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="w-full">
        <ChatComposer onSend={onSend} disabled={disabled} autoFocus />
      </div>
    </div>
  )
}
