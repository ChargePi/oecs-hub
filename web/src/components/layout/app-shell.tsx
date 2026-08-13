import { Suspense } from 'react'
import { Outlet } from 'react-router'

import { Header } from './header'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
