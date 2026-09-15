import { create } from 'zustand'

import type { ToastSeverity } from '@/lib/errors'

export interface ToastItem {
  id: string
  title?: string
  message: string
  severity: ToastSeverity
}

interface ToastStoreState {
  toasts: ToastItem[]
  push: (message: string, title?: string, severity?: ToastSeverity) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  push: (message, title, severity = 'error') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, title, severity }] }))
    return id
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Imperative helper for non-component code (API clients, other stores) that can't
 *  use the useToastStore hook directly - mirrors how chat-stream-store.ts reaches
 *  other stores via .getState(). */
export function toastError(message: string, title?: string, severity?: ToastSeverity): string {
  return useToastStore.getState().push(message, title, severity)
}
