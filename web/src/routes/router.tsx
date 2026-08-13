import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'

import { AppShell } from '@/components/layout/app-shell'
import { ExplorerLayout } from '@/components/layout/explorer-layout'
import { ExplorerPage } from '@/features/explorer/explorer-page'

const GraphPage = lazy(() =>
  import('@/features/graph/graph-page').then((m) => ({ default: m.GraphPage })),
)
const ComparePage = lazy(() =>
  import('@/features/comparison/compare-page').then((m) => ({ default: m.ComparePage })),
)

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <ExplorerPage /> },
      {
        element: <ExplorerLayout />,
        children: [{ path: 'explore/:manufacturerId', element: <GraphPage /> }],
      },
      { path: 'compare', element: <ComparePage /> },
    ],
  },
])
