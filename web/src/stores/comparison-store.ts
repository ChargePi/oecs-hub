import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_COMPARISON_ITEMS = 4

/** dataTransfer MIME type used to drag a variant card onto the comparison sidebar. */
const VARIANT_DRAG_MIME_TYPE = 'application/x-oecs-variant-id'

interface ComparisonState {
  variantIds: string[]
  /** The variant every other compared value is measured against; falls back to the first
   *  added variant when unset or when the chosen reference is removed. */
  referenceId: string | null
  add: (variantId: string) => void
  remove: (variantId: string) => void
  toggle: (variantId: string) => void
  clear: () => void
  has: (variantId: string) => boolean
  setReference: (variantId: string) => void
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      variantIds: [],
      referenceId: null,
      add: (variantId) =>
        set((state) =>
          state.variantIds.includes(variantId) || state.variantIds.length >= MAX_COMPARISON_ITEMS
            ? state
            : { variantIds: [...state.variantIds, variantId] },
        ),
      remove: (variantId) =>
        set((state) => ({
          variantIds: state.variantIds.filter((id) => id !== variantId),
          referenceId: state.referenceId === variantId ? null : state.referenceId,
        })),
      toggle: (variantId) =>
        get().has(variantId) ? get().remove(variantId) : get().add(variantId),
      clear: () => set({ variantIds: [], referenceId: null }),
      has: (variantId) => get().variantIds.includes(variantId),
      setReference: (variantId) => set({ referenceId: variantId }),
    }),
    { name: 'oecs-comparison' },
  ),
)

export { MAX_COMPARISON_ITEMS, VARIANT_DRAG_MIME_TYPE }
