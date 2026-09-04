import { useInfiniteQuery } from '@tanstack/react-query'

import { registryClient } from '@/lib/registry/client'

const PAGE_SIZE = 24

export function useManufacturerSearch(query: string) {
  return useInfiniteQuery({
    queryKey: ['manufacturer-search', query],
    queryFn: ({ pageParam }) =>
      registryClient.searchManufacturers({ query, pageSize: PAGE_SIZE, pageToken: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
  })
}
