import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = getSafeRedirect(searchParams.get('redirect') || window.localStorage.getItem('kelabsukan.postLoginRedirect'))

  useEffect(() => {
    if (!isLoading && user) {
      navigate(redirectTo)
    }
  }, [isLoading, user, navigate, redirectTo])

  if (isLoading) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Checking your session...</CardContent>
      </Card>
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

      window.localStorage.removeItem('kelabsukan.postLoginRedirect')
      navigate(redirectTo)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto mt-4 max-w-md sm:mt-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Welcome back</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-950">Log in</h1>
          <p className="text-sm leading-6 text-slate-600">
            Use your KelabSukan account. Your session stays active on this device.
          </p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {(!isSupabaseConfigured || error) && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error || 'Supabase is not configured for this environment yet.'}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="login-email">Email</label>
              <Input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                disabled={isSubmitting || !isSupabaseConfigured}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="login-password">Password</label>
              <Input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={isSubmitting || !isSupabaseConfigured}
              />
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting || !isSupabaseConfigured}>
              <LogIn size={17} aria-hidden="true" />
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-sm text-slate-600">
            <p>
              <Link className="font-semibold text-emerald-700" to="/forgot-password">Forgot password?</Link>
            </p>
            <p>
              New here? <Link className="font-semibold text-emerald-700" to={`/register?redirect=${encodeURIComponent(redirectTo)}`}>Create account</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}
