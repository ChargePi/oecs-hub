import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CHAT_ENABLED } from '@/lib/chat/config'

import { useOpenAssistant } from './use-open-assistant'

export function AssistantToggle() {
  const { isOpen: open, toggle } = useOpenAssistant()

  if (!CHAT_ENABLED) return null

  return (
    <Button variant={open ? 'secondary' : 'ghost'} size="sm" onClick={toggle} aria-pressed={open}>
      <Sparkles />
      Assistant
    </Button>
  )
}
