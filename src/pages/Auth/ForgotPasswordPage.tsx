import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

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
    <section className="mx-auto mt-4 max-w-md sm:mt-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--arena-accent)]">Account recovery</p>
          <h1 className="text-2xl font-bold leading-tight text-[var(--arena-text)]">Reset password</h1>
          <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
            Enter your account email and we will send a secure reset link.
          </p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {(!isSupabaseConfigured || error || message) && (
              <div
                role="status"
                className={
                  message
                    ? 'rounded-lg border border-[var(--arena-success)]/20 bg-[var(--arena-success-soft)] px-3 py-2 text-sm text-[var(--arena-success)]'
                    : 'rounded-lg border border-[var(--arena-danger)]/20 bg-[var(--arena-danger-soft)] px-3 py-2 text-sm text-[var(--arena-danger)]'
                }
              >
                {message || error || 'Supabase is not configured for this environment yet.'}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--arena-text-muted)]" htmlFor="reset-email">Email</label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                disabled={isSubmitting || !isSupabaseConfigured}
              />
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting || !isSupabaseConfigured}>
              <Mail size={17} aria-hidden="true" />
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>

          <p className="mt-5 text-sm text-[var(--arena-text-muted)]">
            Remembered it? <Link className="font-semibold text-[var(--arena-accent)]" to="/login">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
