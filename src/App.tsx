import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import './App.css'

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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter>
            <Layout>
              <Suspense fallback={<div className="p-4 text-sm text-slate-600">Loading...</div>}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/member/:userId" element={<MemberProfilePage />} />
                  <Route path="/invite/:inviteToken" element={<InviteJoinPage />} />
                  <Route path="/join/:inviteCode" element={<InviteJoinPage />} />
                  <Route path="/game/:eventId" element={<GameDaySharePage />} />
                  <Route path="/club/:clubId" element={<ClubHomePage />} />
                  <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
                  <Route path="/club/:clubId/members" element={<ClubMembersPage />} />
                  <Route path="/not-found" element={<NotFoundPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
