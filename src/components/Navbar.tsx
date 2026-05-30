import { Link } from 'react-router-dom'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/club/club-1', label: 'Club Home' },
  { href: '/login', label: 'Log in' },
]

export default function Navbar() {
  return (
    <nav className="nav-bar">
      <div className="site-brand">RacketScore</div>
      <div className="nav-links">
        {navItems.slice(0, 2).map((item) => (
          <Link key={item.href} className="nav-link" to={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
      <div className="nav-links">
        <Link className="nav-link" to="/register">
          Sign up
        </Link>
        <Link className="nav-action" to="/login">
          Log in
        </Link>
      </div>
    </nav>
  )
}
