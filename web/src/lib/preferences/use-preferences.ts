import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useIdentity } from '@/lib/auth/use-identity'
import { useToastAction } from '@/lib/use-toast-action'
import { usePreferencesStore } from '@/stores/preferences-store'

import { getPreferences, updatePreferences } from './client'
import type { Preferences } from './types'

const QUERY_KEY = ['preferences']

export function usePreferencesSync() {
  const { identity } = useIdentity()
  const setPreferences = usePreferencesStore((s) => s.set)

  const { data } = useQuery({
    queryKey: [...QUERY_KEY, identity?.id],
    queryFn: getPreferences,
    enabled: identity != null,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (data) setPreferences(data)
  }, [data, setPreferences])
}

export function usePreferences(): Preferences {
  return usePreferencesStore((s) => s.preferences)
}

export function useUpdatePreferences() {
  const { identity } = useIdentity()
  const queryClient = useQueryClient()
  const { run, isPending } = useToastAction()
  const setPreferences = usePreferencesStore((s) => s.set)

  async function update(patch: Partial<Preferences>): Promise<boolean> {
    const previous = usePreferencesStore.getState().preferences
    const next = { ...previous, ...patch }
    setPreferences(next)

    if (!identity) return true

    const saved = await run(() => updatePreferences(next))
    if (saved === undefined) {
      setPreferences(previous)
      return false
    }

    setPreferences(saved)
    queryClient.setQueryData([...QUERY_KEY, identity.id], saved)
    return true
  }

  return { update, isPending }
}

export function useIsSimplified(): boolean {
  return usePreferencesStore((s) => s.preferences.viewMode === 'simplified')
}

export function useEffectiveChatLayout(): 'drawer' | 'page' {
  return usePreferencesStore(({ preferences: { chatLayout, viewMode } }) => {
    if (chatLayout !== 'auto') return chatLayout
    return viewMode === 'simplified' ? 'page' : 'drawer'
  })
}
