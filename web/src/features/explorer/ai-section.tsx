import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ArrowUp, BookOpen, GitCompare, Search, Sparkles } from 'lucide-react'

import { Reveal } from '@/components/reveal'
import { loginRedirect, useIdentity } from '@/lib/auth/use-identity'
import { useSuggestedPrompts } from '@/features/chat/use-suggested-prompts'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

const SUGGESTED_PROMPT_COUNT = 4

type Capability = { icon: LucideIcon; title: string; body: string }

const CAPABILITIES: Capability[] = [
  {
    icon: BookOpen,
    title: 'Explains the jargon',
    body: 'OCPP, ISO 15118, connector standards and smart charging — in plain language.',
  },
  {
    icon: Search,
    title: 'Finds matching chargers',
    body: 'Describe your site, car or budget and get chargers from the registry that fit.',
  },
  {
    icon: GitCompare,
    title: 'Weighs the trade-offs',
    body: 'Ask which charger suits you better and get a side-by-side breakdown.',
  },
]

export function AiSection() {
  const ask = useChatDrawerStore((s) => s.ask)
  const { identity, isLoading } = useIdentity()
  const navigate = useNavigate()
  const prompts = useSuggestedPrompts().slice(0, SUGGESTED_PROMPT_COUNT)
  const [draft, setDraft] = useState('')

  /** Signed-out users go through login and land on /chat with the prompt still attached. */
  function submit(prompt: string) {
    const text = prompt.trim()
    if (!text) return
    if (!identity && !isLoading) {
      navigate(loginRedirect('/chat', `?prompt=${encodeURIComponent(text)}`))
      return
    }
    ask(text)
    setDraft('')
  }

  return (
    <section>
      <div className="mx-auto max-w-4xl px-4 pt-12 pb-8 md:px-6 md:pt-16">
        <Reveal className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tighter text-balance md:text-5xl">
            Not sure what you need? <span className="text-muted-foreground">Just ask.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-muted-foreground md:text-lg">
            The OECS assistant answers questions about chargers and charging standards, grounded in the registry's
            data.
          </p>
        </Reveal>

        <Reveal delay={100} className="relative mt-12">
          <div
            aria-hidden="true"
            className="absolute inset-x-12 -top-8 bottom-0 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative overflow-hidden rounded-2xl bg-card/90 p-5 shadow-2xl shadow-black/50 ring-1 ring-foreground/10 backdrop-blur md:p-6">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-foreground/25 to-transparent"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit(draft)
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-background/60 py-2 pr-2 pl-4 ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-ring"
            >
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything about EV chargers…"
                aria-label="Ask the assistant"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(prompt)}
                  className="max-w-full truncate rounded-full bg-background/40 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-5 border-t border-border/60 pt-6 sm:grid-cols-3">
              {CAPABILITIES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium">{title}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
