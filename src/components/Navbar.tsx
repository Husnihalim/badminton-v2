import { Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Bell, Home, LayoutDashboard, LogIn, LogOut, User, UserPlus, Settings, Shield, Sun, Moon, Users, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationsPanel from './NotificationsPanel'
import logoImg from '../assets/logo.png'
import { getMyClubs } from '../lib/api'
import type { Club } from '../types'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [clubs, setClubs] = useState<(Club & { role: string })[]>([])
  const [isClubsDropdownOpen, setIsClubsDropdownOpen] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const clubsDropdownRef = useRef<HTMLDivElement>(null)

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  // Handle click outside dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false)
      }
      if (clubsDropdownRef.current && !clubsDropdownRef.current.contains(target)) {
        setIsClubsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch user's active clubs
  useEffect(() => {
    if (!user) {
      setClubs([])
      return
    }

    let isMounted = true
    getMyClubs()
      .then((data) => {
        if (isMounted) {
          setClubs(data)
        }
      })
      .catch((err) => {
        console.error('Error fetching clubs for navbar:', err)
      })

    return () => {
      isMounted = false
    }
  }, [user, location.pathname])

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
          <img src={logoImg} alt="kelabsukan.com logo" className="site-brand-logo" />
          <span className="site-brand-text">kelabsukan.com</span>
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
            <>
              {clubs.length === 0 ? (
                <Link className="nav-link" to="/dashboard" aria-label="Find clubs">
                  <Users size={16} aria-hidden="true" />
                  Find Clubs
                </Link>
              ) : clubs.length === 1 ? (
                <Link className="nav-link" to={`/club/${clubs[0].id}`} aria-label={`Go to ${clubs[0].name}`}>
                  <Users size={16} aria-hidden="true" />
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '120px'
                  }}>
                    {clubs[0].name}
                  </span>
                </Link>
              ) : (
                <div className="nav-user-container" ref={clubsDropdownRef}>
                  <button
                    type="button"
                    className="nav-link"
                    onClick={() => setIsClubsDropdownOpen(prev => !prev)}
                    aria-expanded={isClubsDropdownOpen}
                    aria-haspopup="true"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Users size={16} aria-hidden="true" />
                    <span>Clubs</span>
                    <ChevronDown size={14} aria-hidden="true" style={{ 
                      transform: isClubsDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease'
                    }} />
                  </button>
                  {isClubsDropdownOpen && (
                    <div className="nav-dropdown-menu" style={{ right: 'auto', left: 0 }}>
                      {clubs.map((club) => (
                        <Link
                          key={club.id}
                          className="nav-dropdown-item"
                          to={`/club/${club.id}`}
                          onClick={() => setIsClubsDropdownOpen(false)}
                        >
                          <Users size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                          <span style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            maxWidth: '180px'
                          }}>
                            {club.name}
                          </span>
                        </Link>
                      ))}
                      <div className="nav-dropdown-divider" />
                      <Link
                        className="nav-dropdown-item"
                        to="/dashboard"
                        onClick={() => setIsClubsDropdownOpen(false)}
                        style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                      >
                        <LayoutDashboard size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                        Find more clubs
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="nav-links">
          {/* Theme Toggle */}
          <button
            type="button"
            className="nav-link"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ padding: '8px 10px', minWidth: '40px' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
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
                    
                    {user.role === 'superadmin' && (
                      <Link 
                        className="nav-dropdown-item" 
                        to="/superadmin/analytics"
                        onClick={() => setIsDropdownOpen(false)}
                        style={{ color: '#ef4444' }}
                      >
                        <Shield size={15} aria-hidden="true" style={{ color: '#f87171' }} />
                        Super Admin Panel
                      </Link>
                    )}
                    
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

