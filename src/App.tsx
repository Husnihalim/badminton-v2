import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { ThemeProvider } from './context/ThemeContext';

import './App.css'

function PrefetchRoutes() {
  useEffect(() => {
    const idle = typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 2000)

    idle(() => {
      import('./pages/DashboardPage')
      import('./pages/Auth/LoginPage')
      import('./pages/Auth/RegisterPage')
      import('./pages/FriendliesListPage')
      import('./pages/ClubHomePage')
    })
  }, [])

  return null
}

const FriendlyRedirect = () => {
  const { competitionId } = useParams();
  return <Navigate to={`/competition/${competitionId}`} replace />;
};

const InviteRedirect = () => {
  const { inviteCode } = useParams();
  return <Navigate to={`/c/${inviteCode}`} replace />;
};


const LandingPage = lazy(() => import('./pages/LandingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ClubHomePage = lazy(() => import('./pages/ClubHomePage'))
const ClubSettingsPage = lazy(() => import('./pages/ClubSettingsPage'))
const ClubMembersPage = lazy(() => import('./pages/ClubMembersPage'))
const InviteJoinPage = lazy(() => import('./pages/InviteJoinPage'))
const GameDaySharePage = lazy(() => import('./pages/GameDaySharePage'))
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPasswordPage'))
const MemberProfilePage = lazy(() => import('./pages/MemberProfilePage'))
const PlayerHomePreviewPage = lazy(() => import('./pages/PlayerHomePreviewPage'))
const UiPreviewPage = lazy(() => import('./pages/UiPreviewPage'))
const SuperAdminAnalyticsPage = lazy(() => import('./pages/SuperAdminAnalyticsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const FriendliesListPage = lazy(() => import('./pages/FriendliesListPage'))
const CompetitionDetailsPage = lazy(() => import('./pages/CompetitionDetailsPage'))
const PublicCompetitionPage = lazy(() => import('./pages/PublicCompetitionPage'))


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <BrowserRouter>
                <PrefetchRoutes />
                <Layout>
                  <Suspense fallback={<div className="p-4 text-sm text-[var(--arena-text-muted)]">Loading...</div>}>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/my-court" element={<DashboardPage />} />
                      <Route path="/dashboard" element={<Navigate to="/my-court" replace />} />
                      <Route path="/player-home-preview" element={<PlayerHomePreviewPage />} />
                      <Route path="/ui-preview" element={<UiPreviewPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/member/:userId" element={<MemberProfilePage />} />
                      <Route path="/invite/:inviteToken" element={<InviteJoinPage />} />
                      <Route path="/join/:inviteCode" element={<InviteJoinPage />} />
                      <Route path="/game/:eventId" element={<GameDaySharePage />} />
                      <Route path="/club/:clubId" element={<ClubHomePage />} />
                      <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
                      <Route path="/club/:clubId/members" element={<ClubMembersPage />} />
                      <Route path="/superadmin/analytics" element={<SuperAdminAnalyticsPage />} />
                      <Route path="/friendlies" element={<Navigate to="/competitions" replace />} />
                      <Route path="/friendly/:competitionId" element={<FriendlyRedirect />} />
                      <Route path="/f/:inviteCode" element={<InviteRedirect />} />
                      <Route path="/competitions" element={<FriendliesListPage />} />
                      <Route path="/competition/:competitionId" element={<CompetitionDetailsPage />} />
                      <Route path="/c/:inviteCode" element={<PublicCompetitionPage />} />
                      <Route path="/not-found" element={<NotFoundPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </BrowserRouter>
            </NotificationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
