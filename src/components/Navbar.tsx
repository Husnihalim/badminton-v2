import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, Home, LayoutDashboard, LogIn, LogOut, User, UserPlus, Settings, Shield, Sun, Moon, Users, ChevronDown, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationsPanel from './NotificationsPanel'
import logoImg from '../assets/logo.webp'
import { getMyClubs } from '../lib/api/clubs'
import { useTheme } from '../context/ThemeContext';
const Navbar = memo(function Navbar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isClubsDropdownOpen, setIsClubsDropdownOpen] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const clubsDropdownRef = useRef<HTMLDivElement>(null)

  const { theme, toggleTheme } = useTheme();

  const { data: clubs = [] } = useQuery({
    queryKey: ['my-clubs', user?.id],
    queryFn: getMyClubs,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

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

  const navClass = (path: string) => {
    const isActive = path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)
    return `nav-link${isActive ? ' active' : ''}`
  }

  return (
    <>
      <nav className="nav-bar" data-tour-id="navbar">
        <Link className="site-brand" to="/">
          <img src={logoImg} alt="kelabsukan.com logo" className="site-brand-logo" loading="eager" />
          <span className="site-brand-text">kelabsukan.com</span>
        </Link>
        <div className="nav-links">
          <Link className={navClass('/')} to="/">
            <Home size={16} aria-hidden="true" />
            Home
          </Link>
          <Link className={navClass('/my-court')} to="/my-court">
            <LayoutDashboard size={16} aria-hidden="true" />
            My Court
          </Link>
          <Link className={navClass('/competitions')} to="/competitions">
            <Trophy size={16} aria-hidden="true" />
            Competitions
          </Link>

          {user && (
            <>
              {clubs.length === 0 ? (
                <Link className={navClass('/my-court')} to="/my-court" aria-label="Find clubs">
                  <Users size={16} aria-hidden="true" />
                  Find Clubs
                </Link>
              ) : clubs.length === 1 ? (
                <Link className={navClass('/club')} to={`/club/${clubs[0].id}`} aria-label={`Go to ${clubs[0].name}`}>
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
                <>
                  {/* Desktop view: Dropdown */}
                  <div className="nav-user-container desktop-only" ref={clubsDropdownRef}>
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
                          to="/my-court"
                          onClick={() => setIsClubsDropdownOpen(false)}
                          style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                        >
                          <LayoutDashboard size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                          Find more clubs
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Mobile view: Direct links in the scroll container */}
                  {clubs.map((club) => (
                    <Link
                      key={`mobile-club-${club.id}`}
                      className={`${navClass(`/club/${club.id}`)} mobile-only`}
                      to={`/club/${club.id}`}
                      aria-label={`Go to ${club.name}`}
                    >
                      <Users size={16} aria-hidden="true" />
                      <span style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        maxWidth: '120px'
                      }}>
                        {club.name}
                      </span>
                    </Link>
                  ))}
                  <Link
                    className={`${navClass('/my-court')} mobile-only`}
                    to="/my-court"
                    aria-label="Find clubs"
                    style={{ opacity: 0.8 }}
                  >
                    <LayoutDashboard size={16} aria-hidden="true" />
                    Find Clubs
                  </Link>
                </>
              )}
            </>
          )}
        </div>
        <div className="nav-links">
          {/* Theme Toggle */}
          <button
            type="button"
            className="nav-link theme-toggle-btn"
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
                      backgroundColor: 'var(--arena-danger)',
                      color: 'var(--arena-danger-text)',
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
                      to="/my-court"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <LayoutDashboard size={15} aria-hidden="true" />
                      My Court
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
                        style={{ color: 'var(--arena-danger)' }}
                      >
                        <Shield size={15} aria-hidden="true" style={{ color: 'var(--arena-danger)' }} />
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
})

export default Navbar
