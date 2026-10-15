import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Menu, Zap } from 'lucide-react'

import { cn } from '@/lib/utils'
import { AuthStatus } from '@/features/auth/auth-status'
import { AssistantToggle } from '@/features/chat/assistant-toggle'
import { SearchBar } from '@/components/search-bar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIdentity } from '@/lib/auth/use-identity'

const NAV_LINKS = [
  { to: '/manufacturers', label: 'Manufacturers' },
  { to: '/chargers', label: 'Chargers' },
  { to: '/compare', label: 'Compare' },
]

export function Header() {
  const { identity } = useIdentity()
  const location = useLocation()
  // The menu is open only for the location it was opened on, so any navigation closes it.
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null)
  const menuOpen = menuOpenAt === location.key
  const navLinks = [
    ...NAV_LINKS,
    ...(identity ? [{ to: '/my-chargers', label: 'My chargers' }] : []),
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 md:gap-4 md:px-6">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2 font-heading text-base font-semibold"
        >
          <Zap className="size-5 text-primary" aria-hidden="true" />
          OECS HUB
        </NavLink>

        <div className="flex flex-1 justify-center">
          {location.pathname !== '/' && <SearchBar className="hidden md:block" />}
        </div>

        <nav className="hidden shrink-0 items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'text-sm transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <AssistantToggle />
        <AuthStatus />

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMenuOpenAt(location.key)}
        >
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </div>

      <Sheet open={menuOpen} onOpenChange={(open) => setMenuOpenAt(open ? location.key : null)}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 p-4">
            <SearchBar className="max-w-none" />
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
