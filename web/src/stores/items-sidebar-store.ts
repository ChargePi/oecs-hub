import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Persisted (unlike chat-activity-store): this is a user display preference, not
// per-tab session state - it should still be collapsed/expanded the way they left it
// after a reload.
interface ItemsSidebarState {
  collapsed: boolean
  toggle: () => void
}

export const useItemsSidebarStore = create<ItemsSidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      toggle: () => set({ collapsed: !get().collapsed }),
    }),
    { name: 'oecs-items-sidebar' },
  ),
)
