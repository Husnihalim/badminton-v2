import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { user, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !name || !password) {
      setError('Name, email, and password are required.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this environment yet.')
      return
    }
    const result = await register(email, name, password)
    if (!result.success) {
      setError(result.error || 'Could not create account. Please try again.')
      return
    }
    navigate('/dashboard')
  }

  return (
    <section className="section-card">
      <h1 className="page-title">Create account</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Keep signup simple for now—just your name and email to get started.
      </p>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ color: '#b91c1c', marginBottom: '16px' }}>{error}</div>
        )}
        {!isSupabaseConfigured && !error && (
          <div style={{ color: '#b91c1c', marginBottom: '16px' }}>
            Supabase is not configured for this environment yet.
          </div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aisha K."
            disabled={!isSupabaseConfigured}
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
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={!isSupabaseConfigured}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            disabled={!isSupabaseConfigured}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            disabled={!isSupabaseConfigured}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
        <button type="submit" className="brand-button" style={{ width: '100%' }} disabled={!isSupabaseConfigured}>
          Sign up
        </button>
      </form>
      <p style={{ marginTop: '18px', color: '#64748b' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}
