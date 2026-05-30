import { Link } from 'react-router-dom'

export default function RegisterPage() {
  return (
    <section className="section-card">
      <h1 className="page-title">Create account</h1>
      <form>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
        <button type="submit" className="brand-button" style={{ width: '100%' }}>
          Sign up
        </button>
      </form>
      <p style={{ marginTop: '18px', color: '#64748b' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}
