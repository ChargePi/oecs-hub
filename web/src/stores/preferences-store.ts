import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_PREFERENCES, type Preferences } from '@/lib/preferences/types'

interface PreferencesState {
  preferences: Preferences
  set: (preferences: Preferences) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      set: (preferences) => set({ preferences }),
    }),
    {
      name: 'oecs-preferences',
      merge: (persisted, current) => ({
        ...current,
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...(persisted as Partial<PreferencesState> | undefined)?.preferences,
        },
      }),
    },
  ),
)
