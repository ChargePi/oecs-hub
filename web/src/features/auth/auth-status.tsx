import { CircleUserRound, LogOut, UserRound, Upload } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIdentity } from '@/lib/auth/use-identity'
import { useLogout } from '@/lib/auth/use-logout'

export function AuthStatus() {
  const { identity, isLoading } = useIdentity()
  const { logout, isLoggingOut } = useLogout()

  if (isLoading) return null

  if (!identity) {
    return (
      <Button asChild size="sm">
        <Link to="/auth/login">Log in / Sign up</Link>
      </Button>
    )
  }

  const displayName =
    identity.userType === 'manufacturer'
      ? (identity.companyName ?? identity.name ?? identity.email)
      : (identity.name ?? identity.email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-40 rounded-full sm:max-w-56">
          <CircleUserRound className="size-5 shrink-0" aria-hidden="true" />
          <span className="truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {identity.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound />
            Profile
          </Link>
        </DropdownMenuItem>
        {identity.userType === 'manufacturer' && (
          <DropdownMenuItem asChild>
            <Link to="/submit-charger">
              <Upload />
              Submit Charger
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} disabled={isLoggingOut}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
