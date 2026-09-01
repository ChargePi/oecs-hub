import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'

// Shared post-flow-completion action for login/registration: the session cookie is
// already set by Kratos at this point, so this just tells React Query to refetch it and
// sends the user where they were headed.
export function useAuthSuccess() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    navigate(searchParams.get('return_to') ?? '/', { replace: true })
  }, [navigate, queryClient, searchParams])
}
