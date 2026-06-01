import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

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
    <section className="mx-auto mt-4 max-w-md sm:mt-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Account recovery</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-950">Set new password</h1>
          <p className="text-sm leading-6 text-slate-600">
            Enter a new password for your KelabSukan account.
          </p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {(!isSupabaseConfigured || error || message) && (
              <div
                role="status"
                className={
                  message
                    ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                    : 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
                }
              >
                {message || error || 'Supabase is not configured for this environment yet.'}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="new-password">New password</label>
              <Input
                id="new-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Enter a new password"
                disabled={isSubmitting || !isSupabaseConfigured}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="confirm-new-password">
                Confirm new password
              </label>
              <Input
                id="confirm-new-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
                disabled={isSubmitting || !isSupabaseConfigured}
              />
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting || !isSupabaseConfigured}>
              <KeyRound size={17} aria-hidden="true" />
              {isSubmitting ? 'Updating...' : 'Update password'}
            </Button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Back to <Link className="font-semibold text-emerald-700" to="/login">log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
