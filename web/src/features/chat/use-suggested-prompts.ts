import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { registryClient } from '@/lib/registry/client'
import type { ChargerVariant } from '@/lib/oecs/types'

type PromptSlot = 'price' | 'protocol' | 'comparison'

const DEFAULT_TEMPLATES: Record<PromptSlot, string[]> = {
  price: ['Find me the best charger under {price}'],
  protocol: ['What is {protocol}?'],
  comparison: ['Which one is better: the {chargerA} or the {chargerB}?'],
}

const FALLBACK_PROMPTS = ['Find me the best charger under 1000€', 'What is OCPP 1.6?']

/**
 * Fetches `/chat-prompts/{slot}.txt` - one template per non-empty, non-comment line, with
 * `{placeholder}` tokens - so prompt wording can be recustomized by editing or volume-mounting
 * that directory (see deployments/docker/docker-compose.dev.yaml's web service) without a
 * rebuild. Falls back to a built-in default template when the file is missing or unreachable.
 */
function usePromptTemplates(slot: PromptSlot): string[] {
  const { data } = useQuery({
    queryKey: ['chat-prompt-template', slot],
    queryFn: async () => {
      const res = await fetch(`/chat-prompts/${slot}.txt`)
      if (!res.ok) throw new Error(`${res.status}`)
      const lines = (await res.text())
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
      return lines.length > 0 ? lines : DEFAULT_TEMPLATES[slot]
    },
    staleTime: Infinity,
    retry: false,
  })
  return data ?? DEFAULT_TEMPLATES[slot]
}

/** Fills `{placeholder}` tokens from `values`; returns null if any token has no value. */
function fillTemplate(template: string, values: Record<string, string>): string | null {
  let missing = false
  const filled = template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key]
    if (value == null) missing = true
    return value ?? match
  })
  return missing ? null : filled
}

function pickTwoIndices(count: number): number[] {
  if (count < 2) return []
  const i = Math.floor(Math.random() * count)
  let j = Math.floor(Math.random() * (count - 1))
  if (j >= i) j += 1
  return [i, j]
}

function pickRandom<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[Math.floor(Math.random() * items.length)] : undefined
}

/** Rounds a real price up to a "nice" round number strictly above it, so "under X" reads
 *  as a sensible filter rather than an oddly specific figure (e.g. 2490 -> 2500). */
function roundUpToNiceNumber(value: number): number {
  if (value <= 0) return 1000
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = magnitude / 2
  return Math.ceil((value * 1.02) / step) * step
}

function priceValues(variant: ChargerVariant | null | undefined): Record<string, string> | null {
  const price = pickRandom(variant?.pricing?.prices ?? [])
  if (!price) return null

  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(roundUpToNiceNumber(price.value))
  return { price: amount }
}

function protocolValues(variant: ChargerVariant | null | undefined): Record<string, string> | null {
  const protocol = pickRandom(variant?.software.protocols ?? [])
  if (!protocol) return null

  const name = protocol.name === 'other' ? protocol.otherName : protocol.name
  if (!name) return null
  return { protocol: `${name} ${protocol.version}` }
}

function comparisonValues(variants: ChargerVariant[]): Record<string, string> | null {
  const [i, j] = pickTwoIndices(variants.length)
  if (i === undefined || j === undefined) return null

  const a = variants[i]
  const b = variants[j]
  return {
    chargerA: `${a.manufacturer.name} ${a.model.name}`,
    chargerB: `${b.manufacturer.name} ${b.model.name}`,
  }
}

function buildPrompt(templates: string[], values: Record<string, string> | null): string | null {
  if (!values) return null
  const template = pickRandom(templates)
  if (!template) return null
  return fillTemplate(template, values)
}

/**
 * A few example prompts drawn from the real catalog. The comparison prompt only needs names, so
 * it's built from the lightweight ["all-variants"] summaries (shared with add-charger-control's
 * cache). Summaries don't carry pricing/protocol data though, so the price and protocol prompts
 * are built from one randomly picked variant's full spec instead - falls back to a generic
 * prompt per slot while data is still loading or the catalog/pick lacks what that slot needs.
 */
export function useSuggestedPrompts(): string[] {
  const { data: variants } = useQuery({
    queryKey: ['all-variants'],
    queryFn: () => registryClient.listVariants(),
  })

  const detailId = useMemo(() => pickRandom(variants ?? [])?.id, [variants])

  const { data: detail } = useQuery({
    queryKey: ['variant', detailId],
    queryFn: () => registryClient.getVariant(detailId!),
    enabled: detailId != null,
  })

  const priceTemplates = usePromptTemplates('price')
  const protocolTemplates = usePromptTemplates('protocol')
  const comparisonTemplates = usePromptTemplates('comparison')

  return useMemo(() => {
    if (!variants || variants.length === 0) return FALLBACK_PROMPTS

    const prompts = [
      buildPrompt(priceTemplates, priceValues(detail)) ?? FALLBACK_PROMPTS[0],
      buildPrompt(protocolTemplates, protocolValues(detail)) ?? FALLBACK_PROMPTS[1],
      buildPrompt(comparisonTemplates, comparisonValues(variants)),
    ]
    return prompts.filter((p): p is string => p != null)
    // Re-pick only when the underlying variant list, resolved detail, or templates change.
  }, [variants, detail, priceTemplates, protocolTemplates, comparisonTemplates])
}
