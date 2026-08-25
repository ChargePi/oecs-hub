import { Outlet } from 'react-router'
import { PanelLeftOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useChatSidebarStore } from '@/stores/chat-sidebar-store'
import { ConversationListSidebar } from './conversation-list-sidebar'

export function ChatLayout() {
  const collapsed = useChatSidebarStore((s) => s.collapsed)
  const toggle = useChatSidebarStore((s) => s.toggle)

  return (
    // Explicit height (matching the sidebar/recommendations panel's own
    // h-[calc(100svh-3.5rem)]), and the middle column is itself a flex container - the
    // page rendered by Outlet relies on that to stretch to full height (its empty-state
    // centers with h-full, which needs a definite height to resolve against; a plain
    // `flex-1` on a non-flex parent does nothing).
    <div className="flex h-[calc(100svh-3.5rem)]">
      {collapsed ? (
        // The sidebar's own collapse button goes away with it, so this is the only way
        // back - sticky at the same top offset the sidebar's header row sits at.
        <div className="sticky top-14 flex h-[calc(100svh-3.5rem)] shrink-0 items-start p-3">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={toggle}
            aria-label="Show conversation history"
          >
            <PanelLeftOpen />
          </Button>
        </div>
      ) : (
        <ConversationListSidebar onCollapse={toggle} />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
