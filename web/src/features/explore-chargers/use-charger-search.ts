import { useInfiniteQuery } from '@tanstack/react-query'

import { registryClient } from '@/lib/registry/client'
import type { ChargerFilters } from '@/lib/registry/types'

const PAGE_SIZE = 24

export function useChargerSearch(filters: ChargerFilters) {
  return useInfiniteQuery({
    queryKey: ['charger-search', filters],
    queryFn: ({ pageParam }) =>
      registryClient.searchChargers({ filters, pageSize: PAGE_SIZE, pageToken: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
  })
}
