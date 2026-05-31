import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard')
    }
  }, [isLoading, user, navigate])

  if (isLoading) {
    return (
      <section className="section-card" style={{ maxWidth: '440px', margin: '40px auto', textAlign: 'center' }}>
        <p>Checking your session...</p>
      </section>
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this environment yet.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      const success = await login(email, password)

      if (!success) {
        setError('Could not log in. Please check your email and password.')
        return
      }

      navigate('/dashboard')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="section-card" style={{ maxWidth: '440px', margin: '40px auto' }}>
      <h1 className="page-title">Log in</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Use your existing KelabSukan account email and password.
        We will keep you logged in on this device.
      </p>

      <form onSubmit={handleSubmit}>
        {(!isSupabaseConfigured || error) && (
          <div
            role="alert"
            style={{
              color: '#b91c1c',
              background: '#fee2e2',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            {error || 'Supabase is not configured for this environment yet.'}
          </div>
        )}

        <div className="modal-form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="form-input"
            placeholder="name@example.com"
            disabled={isSubmitting || !isSupabaseConfigured}
          />
        </div>

        <div className="modal-form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="form-input"
            placeholder="Enter your password"
            disabled={isSubmitting || !isSupabaseConfigured}
          />
        </div>

        <button
          type="submit"
          className="brand-button"
          style={{ width: '100%', marginTop: '12px' }}
          disabled={isSubmitting || !isSupabaseConfigured}
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: '18px', color: '#64748b' }}>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>

      <p style={{ marginTop: '10px', color: '#64748b' }}>
        New here? <Link to="/register">Create account</Link>
      </p>
    </section>
  )
}
