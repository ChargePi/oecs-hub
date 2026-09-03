import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'

import { AppShell } from '@/components/layout/app-shell'
import { ExplorerLayout } from '@/components/layout/explorer-layout'
import { ExplorerPage } from '@/features/explorer/explorer-page'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { RequireAuth, RequireManufacturer } from './require-auth'

const GraphPage = lazy(() =>
  import('@/features/graph/graph-page').then((m) => ({ default: m.GraphPage })),
)
const ComparePage = lazy(() =>
  import('@/features/comparison/compare-page').then((m) => ({ default: m.ComparePage })),
)
const ChatLayout = lazy(() =>
  import('@/features/chat/chat-layout').then((m) => ({ default: m.ChatLayout })),
)
const ChatDashboardPage = lazy(() =>
  import('@/features/chat/chat-dashboard-page').then((m) => ({ default: m.ChatDashboardPage })),
)

const LoginPage = lazy(() =>
  import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/features/auth/register-page').then((m) => ({ default: m.RegisterPage })),
)
const RecoveryPage = lazy(() =>
  import('@/features/auth/recovery-page').then((m) => ({ default: m.RecoveryPage })),
)
const VerificationPage = lazy(() =>
  import('@/features/auth/verification-page').then((m) => ({ default: m.VerificationPage })),
)
const ProfilePage = lazy(() =>
  import('@/features/account/profile-page').then((m) => ({ default: m.ProfilePage })),
)
const SubmitChargerPage = lazy(() =>
  import('@/features/submit-charger/submit-charger-page').then((m) => ({
    default: m.SubmitChargerPage,
  })),
)
const PrivacyPage = lazy(() =>
  import('@/features/legal/privacy-page').then((m) => ({ default: m.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('@/features/legal/terms-page').then((m) => ({ default: m.TermsPage })),
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
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      ...(CHAT_ENABLED
        ? [
            {
              path: 'chat',
              element: (
                <RequireAuth>
                  <ChatLayout />
                </RequireAuth>
              ),
              children: [
                { index: true, element: <ChatDashboardPage /> },
                { path: ':conversationId', element: <ChatDashboardPage /> },
              ],
            },
          ]
        : []),
      { path: 'auth', element: <Navigate to="/auth/login" replace /> },
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/register', element: <RegisterPage /> },
      { path: 'auth/recovery', element: <RecoveryPage /> },
      { path: 'auth/verification', element: <VerificationPage /> },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: 'submit-charger',
        element: (
          <RequireManufacturer>
            <SubmitChargerPage />
          </RequireManufacturer>
        ),
      },
    ],
  },
])
