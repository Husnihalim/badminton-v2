import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import ClubHomePage from './pages/ClubHomePage'
import ClubSettingsPage from './pages/ClubSettingsPage'
import ClubMembersPage from './pages/ClubMembersPage'
import InviteJoinPage from './pages/InviteJoinPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/Auth/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/join/:inviteCode" element={<InviteJoinPage />} />
                <Route path="/club/:clubId" element={<ClubHomePage />} />
                <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
                <Route path="/club/:clubId/members" element={<ClubMembersPage />} />
                <Route path="/not-found" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
