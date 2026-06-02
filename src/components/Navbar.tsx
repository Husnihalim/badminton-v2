import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Bell, Home, LayoutDashboard, LogIn, LogOut, User, UserPlus, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationsPanel from './NotificationsPanel'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Helper to extract user initials for the avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }

  // Get localized user role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin'
      case 'owner': return 'Club Owner'
      case 'admin': return 'Club Admin'
      default: return 'Member'
    }
  }

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
              
              {/* Account Dropdown */}
              <div className="nav-user-container" ref={dropdownRef}>
                <button
                  type="button"
                  className="nav-avatar-trigger"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Open user menu"
                >
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name} 
                      className="nav-avatar-img"
                    />
                  ) : (
                    <div className="nav-avatar-fallback">
                      {getInitials(user.name)}
                    </div>
                  )}
                </button>

                {isDropdownOpen && (
                  <div className="nav-dropdown-menu">
                    <div className="nav-dropdown-header">
                      <span className="nav-dropdown-name">{user.name}</span>
                      <span className="nav-dropdown-email">{user.email}</span>
                      <span className={`nav-dropdown-role ${user.role}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                    
                    <div className="nav-dropdown-divider" />
                    
                    <Link 
                      className="nav-dropdown-item" 
                      to="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <LayoutDashboard size={15} aria-hidden="true" />
                      My Dashboard
                    </Link>
                    
                    <Link 
                      className="nav-dropdown-item" 
                      to={`/member/${user.id}`}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User size={15} aria-hidden="true" />
                      View Public Profile
                    </Link>
                    
                    <Link 
                      className="nav-dropdown-item" 
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings size={15} aria-hidden="true" />
                      Account Settings
                    </Link>
                    
                    <div className="nav-dropdown-divider" />
                    
                    <button 
                      type="button" 
                      className="nav-dropdown-item logout" 
                      onClick={() => {
                        setIsDropdownOpen(false)
                        logout()
                      }}
                    >
                      <LogOut size={15} aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
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

