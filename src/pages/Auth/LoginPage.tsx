import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { user, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    const success = await login(email, password)
    if (!success) {
      setError('Invalid email or password.')
      return
    }
    navigate('/dashboard')
  }

  return (
    <section className="section-card">
      <h1 className="page-title">Log in</h1>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ color: '#b91c1c', marginBottom: '16px' }}>{error}</div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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
          Log in
        </button>
      </form>
      <p style={{ marginTop: '18px', color: '#64748b' }}>
        New to KelabSukan? <Link to="/register">Create an account</Link>
      </p>
    </section>
  )
}
