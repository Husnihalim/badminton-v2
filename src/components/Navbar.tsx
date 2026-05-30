import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="nav-bar">
      <div className="site-brand">KelabSukan</div>
      <div className="nav-links">
        <Link className="nav-link" to="/">
          Home
        </Link>
        <Link className="nav-link" to="/dashboard">
          Dashboard
        </Link>
        {user && (
          <Link className="nav-link" to="/profile">
            Profile
          </Link>
        )}
      </div>
      <div className="nav-links">
        {user ? (
          <>
            <span className="nav-link">Hello, {user.name}</span>
            {user.role === 'superadmin' ? <span className="user-badge">Super admin</span> : null}
            <button type="button" className="nav-action" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/register">
              Sign up
            </Link>
            <Link className="nav-action" to="/login">
              Log in
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
