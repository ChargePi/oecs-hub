import { NavLink } from 'react-router'
import { Zap } from 'lucide-react'

import { cn } from '@/lib/utils'
import { AuthStatus } from '@/features/auth/auth-status'
import { SearchBar } from '@/features/explorer/search-bar'

const NAV_LINKS = [
  { to: '/', label: 'Explore' },
  { to: '/compare', label: 'Compare' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2 font-heading text-base font-semibold"
        >
          <Zap className="size-5 text-primary" aria-hidden="true" />
          OECS HUB
        </NavLink>

        <div className="flex flex-1 justify-center">
          <SearchBar />
        </div>

        <nav className="flex shrink-0 items-center gap-6">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
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

        <AuthStatus />
      </div>
    </header>
  )
}
