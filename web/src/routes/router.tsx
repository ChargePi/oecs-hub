import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'

import { AppShell } from '@/components/layout/app-shell'
import { ExplorerLayout } from '@/components/layout/explorer-layout'
import { ExplorerPage } from '@/features/explorer/explorer-page'
import { CHAT_ENABLED } from '@/lib/chat/config'
import { RequireAuth } from './require-auth'

const GraphPage = lazy(() =>
  import('@/features/graph/graph-page').then((m) => ({ default: m.GraphPage })),
)
const ExploreChargersPage = lazy(() =>
  import('@/features/explore-chargers/explore-chargers-page').then((m) => ({
    default: m.ExploreChargersPage,
  })),
)
const ComparePage = lazy(() =>
  import('@/features/comparison/compare-page').then((m) => ({ default: m.ComparePage })),
)
const ManufacturersPage = lazy(() =>
  import('@/features/manufacturers/manufacturers-page').then((m) => ({
    default: m.ManufacturersPage,
  })),
)
const ChatRedirect = lazy(() =>
  import('@/features/chat/chat-redirect').then((m) => ({ default: m.ChatRedirect })),
)

const LoginPage = lazy(() =>
  import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/features/auth/register-page').then((m) => ({ default: m.RegisterPage })),
)
const RegisterCompletePage = lazy(() =>
  import('@/features/auth/register-complete-page').then((m) => ({
    default: m.RegisterCompletePage,
  })),
)
const RecoveryPage = lazy(() =>
  import('@/features/auth/recovery-page').then((m) => ({ default: m.RecoveryPage })),
)
const VerificationPage = lazy(() =>
  import('@/features/auth/verification-page').then((m) => ({ default: m.VerificationPage })),
)
const AuthErrorPage = lazy(() =>
  import('@/features/auth/auth-error-page').then((m) => ({ default: m.AuthErrorPage })),
)
const ProfilePage = lazy(() =>
  import('@/features/account/profile-page').then((m) => ({ default: m.ProfilePage })),
)
const MyChargersPage = lazy(() =>
  import('@/features/my-chargers/my-chargers-page').then((m) => ({ default: m.MyChargersPage })),
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
        children: [
          { path: 'chargers', element: <ExploreChargersPage /> },
          { path: 'chargers/:manufacturerId', element: <GraphPage /> },
        ],
      },
      { path: 'manufacturers', element: <ManufacturersPage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      ...(CHAT_ENABLED
        ? [
            {
              // The assistant lives in a drawer now (see ChatDrawer); these just open it.
              path: 'chat/:conversationId?',
              element: (
                <RequireAuth>
                  <ChatRedirect />
                </RequireAuth>
              ),
            },
          ]
        : []),
      { path: 'auth', element: <Navigate to="/auth/login" replace /> },
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/register', element: <RegisterPage /> },
      { path: 'auth/register/complete', element: <RegisterCompletePage /> },
      { path: 'auth/recovery', element: <RecoveryPage /> },
      { path: 'auth/verification', element: <VerificationPage /> },
      { path: 'auth/error', element: <AuthErrorPage /> },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      { path: 'submit-charger', element: <Navigate to="/my-chargers" replace /> },
      { path: 'manufacturer/chargers', element: <Navigate to="/my-chargers" replace /> },
      {
        path: 'my-chargers',
        element: (
          <RequireAuth>
            <MyChargersPage />
          </RequireAuth>
        ),
      },
    ],
  },
])
