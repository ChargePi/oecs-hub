import { Outlet } from 'react-router'

import { ComparisonSidebar } from '@/features/comparison/comparison-sidebar'

export function ExplorerLayout() {
  return (
    <div className="flex flex-1">
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
      <ComparisonSidebar />
    </div>
  )
}
