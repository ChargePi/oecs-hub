import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { useChatDrawerStore } from '@/stores/chat-drawer-store'

export function AssistantToggle() {
  const open = useChatDrawerStore((s) => s.open)
  const toggle = useChatDrawerStore((s) => s.toggle)

  if (!CHAT_ENABLED) return null

  return (
    <Button variant={open ? 'secondary' : 'ghost'} size="sm" onClick={toggle} aria-pressed={open}>
      <Sparkles />
      Assistant
    </Button>
  )
}
