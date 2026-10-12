import { useChatDrawerStore } from '@/stores/chat-drawer-store'

/** Opens the assistant drawer. */
export function useOpenAssistant() {
  const isOpen = useChatDrawerStore((s) => s.open)

  return {
    isOpen,
    open: () => useChatDrawerStore.getState().setOpen(true),
    toggle: () => useChatDrawerStore.getState().toggle(),
    ask: (prompt: string, chargerIds?: string[]) =>
      useChatDrawerStore.getState().ask(prompt, chargerIds),
  }
}
