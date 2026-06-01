import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = getSafeRedirect(searchParams.get('redirect'))

  useEffect(() => {
    if (user) {
      navigate(redirectTo)
    }
  }, [user, navigate, redirectTo])

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
    if (result.emailVerificationRequired) {
      window.localStorage.setItem('kelabsukan.postLoginRedirect', redirectTo)
      setSuccessMessage(
        redirectTo.startsWith('/invite/') || redirectTo.startsWith('/join/')
          ? 'Account created. Please verify your email, then log in. We will finish joining the club from your invite link.'
          : 'Account created. Please verify your email, then log in to continue.'
      )
      setError('')
      return
    }
    navigate(redirectTo)
  }

  return (
    <section className="mx-auto mt-4 max-w-md sm:mt-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">New member</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-950">Create account</h1>
          <p className="text-sm leading-6 text-slate-600">
            Set up your account so you can join clubs, RSVP, and record scores.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {(error || !isSupabaseConfigured) && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error || 'Supabase is not configured for this environment yet.'}
              </div>
            )}
            {successMessage && (
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                <p>{successMessage}</p>
                <Link className="inline-flex font-semibold text-emerald-900" to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
                  Go to login
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="name">Name</label>
              <Input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aisha K."
                disabled={!isSupabaseConfigured}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={!isSupabaseConfigured}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                disabled={!isSupabaseConfigured}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="confirmPassword">Confirm password</label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={!isSupabaseConfigured}
              />
            </div>

            <Button type="submit" fullWidth disabled={!isSupabaseConfigured}>
              <UserPlus size={17} aria-hidden="true" />
              Sign up
            </Button>
          </form>
          <p className="mt-5 text-sm text-slate-600">
            Already have an account? <Link className="font-semibold text-emerald-700" to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}
