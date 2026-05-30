import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="section-card">
      <h1 className="page-title">Page not found</h1>
      <p>We could not find the page you were looking for.</p>
      <Link to="/" className="brand-button" style={{ marginTop: '18px' }}>
        Return home
      </Link>
    </section>
  )
}
