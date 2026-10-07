// Kept apart from chat-stream-store so chat-drawer-store (loaded on every page) can mint
// keys without pulling the chat client into the main bundle.

/** Placeholder key for a conversation with no server-assigned id yet. */
export function makeDraftKey(): string {
  return `draft:${crypto.randomUUID()}`
}

export function isDraftKey(key: string): boolean {
  return key.startsWith('draft:')
}
