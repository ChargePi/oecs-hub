import { useCallback, useState } from 'react'

import { frontendApi } from './client'

// Kratos logout is a two-step flow: fetch a one-time logout_url, then NAVIGATE to it
// (a GET that clears the session cookie server-side and redirects) - it can't be
// fetch()'d like the rest of the SDK, that would leave the cookie intact.
export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    setIsLoggingOut(true)

    try {
      const { logout_url: logoutUrl } = await frontendApi.createBrowserLogoutFlow()
      window.location.href = logoutUrl
    } catch {
      setIsLoggingOut(false)
    }
  }, [])

  return { logout, isLoggingOut }
}
