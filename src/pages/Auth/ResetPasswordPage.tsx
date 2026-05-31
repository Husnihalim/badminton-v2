import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!password || !confirmPassword) {
      setError('Password and confirmation are required.')
      setMessage('')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setMessage('')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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

      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setMessage('Password updated. Taking you to your dashboard...')
      setTimeout(() => navigate('/dashboard'), 900)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="section-card" style={{ maxWidth: '440px', margin: '40px auto' }}>
      <h1 className="page-title">Set new password</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Enter a new password for your KelabSukan account.
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
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="form-input"
            placeholder="Enter a new password"
            disabled={isSubmitting || !isSupabaseConfigured}
          />
        </div>

        <div className="modal-form-group">
          <label htmlFor="confirm-new-password">Confirm new password</label>
          <input
            id="confirm-new-password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="form-input"
            placeholder="Re-enter the new password"
            disabled={isSubmitting || !isSupabaseConfigured}
          />
        </div>

        <button
          type="submit"
          className="brand-button"
          style={{ width: '100%', marginTop: '12px' }}
          disabled={isSubmitting || !isSupabaseConfigured}
        >
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <p style={{ marginTop: '18px', color: '#64748b' }}>
        Back to <Link to="/login">log in</Link>
      </p>
    </section>
  )
}
