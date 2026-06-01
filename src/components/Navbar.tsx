import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Bell, Home, LayoutDashboard, LogIn, LogOut, User, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationsPanel from './NotificationsPanel'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <>
      <nav className="nav-bar">
        <Link className="site-brand" to="/">
          KelabSukan
        </Link>
        <div className="nav-links">
          <Link className="nav-link" to="/">
            <Home size={16} aria-hidden="true" />
            Home
          </Link>
          <Link className="nav-link" to="/dashboard">
            <LayoutDashboard size={16} aria-hidden="true" />
            Dashboard
          </Link>
          {user && (
            <Link className="nav-link" to="/profile">
              <User size={16} aria-hidden="true" />
              Profile
            </Link>
          )}
        </div>
        <div className="nav-links">
          {user ? (
            <>
              {/* Notifications Bell */}
              <button
                type="button"
                className="nav-action"
                onClick={() => setIsNotificationsOpen(true)}
                style={{ position: 'relative' }}
                aria-label="Open notifications"
              >
                <Bell size={17} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <span className="nav-link">Hi, {user.name}</span>
              {user.role === 'superadmin' ? <span className="user-badge">Super admin</span> : null}
              <button type="button" className="nav-action" onClick={logout}>
                <LogOut size={16} aria-hidden="true" />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/register">
                <UserPlus size={16} aria-hidden="true" />
                Sign up
              </Link>
              <Link className="nav-action" to="/login">
                <LogIn size={16} aria-hidden="true" />
                Log in
              </Link>
            </>
          )}
        </div>
      </nav>

      <NotificationsPanel 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  )
}
