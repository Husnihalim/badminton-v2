import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim()) {
      setError('Email is required.')
      setMessage('')
      return
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this environment yet.')
      setMessage('')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setMessage('If an account exists for that email, a password reset link has been sent.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="section-card" style={{ maxWidth: '440px', margin: '40px auto' }}>
      <h1 className="page-title">Reset password</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Enter your account email and we will send a secure reset link.
      </p>

      <form onSubmit={handleSubmit}>
        {(!isSupabaseConfigured || error || message) && (
          <div
            role="status"
            style={{
              color: message ? '#047857' : '#b91c1c',
              background: message ? '#d1fae5' : '#fee2e2',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            {message || error || 'Supabase is not configured for this environment yet.'}
          </div>
        )}

        <div className="modal-form-group">
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
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

        <button
          type="submit"
          className="brand-button"
          style={{ width: '100%', marginTop: '12px' }}
          disabled={isSubmitting || !isSupabaseConfigured}
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p style={{ marginTop: '18px', color: '#64748b' }}>
        Remembered it? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}
