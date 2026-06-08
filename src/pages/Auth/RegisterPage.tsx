import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { PasswordInput } from '../../components/ui/password-input'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wantCreateClub, setWantCreateClub] = useState(false)
  
  // Optional player card fields
  const [preferredSport, setPreferredSport] = useState('badminton')
  const [city, setCity] = useState('')
  const [playStyle, setPlayStyle] = useState('')
  const [racket, setRacket] = useState('')
  const [racketBalance, setRacketBalance] = useState('')
  const [racketStiffness, setRacketStiffness] = useState('')
  const [racketWeight, setRacketWeight] = useState('')
  const [strings, setStrings] = useState('')
  const [tension, setTension] = useState('')
  const [shoes, setShoes] = useState('')
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = getSafeRedirect(searchParams.get('redirect'))
  const targetRedirect = wantCreateClub ? '/profile?create_club=true' : redirectTo

  useEffect(() => {
    if (user) {
      navigate(targetRedirect)
    }
  }, [user, navigate, targetRedirect])

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

    try {
      setIsSubmitting(true)
      setError('')
      setSuccessMessage('')

      const gear = {
        racket: racket.trim() || null,
        strings: strings.trim() || null,
        tension: tension.trim() || null,
        grip_type: null,
        shoes: shoes.trim() || null,
        racket_weight: racketWeight || null,
        racket_balance: racketBalance || null,
        racket_stiffness: racketStiffness || null,
        play_style: playStyle || null,
      }

      const result = await register(
        email,
        name,
        password,
        getInviteTokenFromRedirect(targetRedirect),
        wantCreateClub,
        targetRedirect,
        {
          preferred_sport: preferredSport,
          city: city.trim() || null,
          gear,
        }
      )
      if (!result.success) {
        setError(result.error || 'Could not create account. Please try again.')
        return
      }
      if (result.emailVerificationRequired) {
        setSuccessMessage(
          targetRedirect.startsWith('/invite/') || targetRedirect.startsWith('/join/')
            ? 'Account created. Please verify your email, then log in. We will continue the invite flow from your link.'
            : wantCreateClub
              ? 'Account created. Please verify your email, then log in. We will open the club registration form for you.'
              : 'Account created. Please verify your email, then log in to continue.'
        )
        return
      }
      navigate(targetRedirect)
    } finally {
      setIsSubmitting(false)
    }
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
                <Link className="inline-flex font-semibold text-emerald-900" to={`/login?redirect=${encodeURIComponent(targetRedirect)}`}>
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
                disabled={!isSupabaseConfigured || isSubmitting}
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
                disabled={!isSupabaseConfigured || isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                disabled={!isSupabaseConfigured || isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="confirmPassword">Confirm password</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={!isSupabaseConfigured || isSubmitting}
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-350 cursor-pointer select-none"
              >
                <span>Step 2: Customize Player Card (Optional)</span>
                <span className="text-xs">{showOptionalFields ? '▲ Close' : '▼ Expand'}</span>
              </button>

              {showOptionalFields && (
                <div className="mt-4 space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/[0.01]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="preferred-sport">Preferred Sport</label>
                      <select
                        id="preferred-sport"
                        value={preferredSport}
                        onChange={(e) => setPreferredSport(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="badminton">Badminton</option>
                        <option value="tennis">Tennis</option>
                        <option value="squash">Squash</option>
                        <option value="pickleball">Pickleball</option>
                        <option value="table tennis">Table tennis</option>
                        <option value="racquetball">Racquetball</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="city">City</label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Shah Alam"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="play-style">Play Style</label>
                      <select
                        id="play-style"
                        value={playStyle}
                        onChange={(e) => setPlayStyle(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">Select style...</option>
                        <option value="net_play">Net Player (Front Court)</option>
                        <option value="aggressive">Aggressive / Smasher (Back Court)</option>
                        <option value="dropshot_control">Dropshot / Control (All-Round)</option>
                        <option value="defensive">Defensive</option>
                        <option value="all_round">All-Round</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="racket">Racket Name</label>
                      <Input
                        id="racket"
                        value={racket}
                        onChange={(e) => setRacket(e.target.value)}
                        placeholder="e.g. Yonex Astrox 88D Pro"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="racket-weight">Weight</label>
                      <select
                        id="racket-weight"
                        value={racketWeight}
                        onChange={(e) => setRacketWeight(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">Select...</option>
                        <option value="3U">3U (85-89g)</option>
                        <option value="4U">4U (80-84g)</option>
                        <option value="5U">5U (75-79g)</option>
                        <option value="F">F (&lt;75g)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="racket-balance">Balance</label>
                      <select
                        id="racket-balance"
                        value={racketBalance}
                        onChange={(e) => setRacketBalance(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">Select...</option>
                        <option value="head_heavy">Head Heavy</option>
                        <option value="even_balance">Even Balance</option>
                        <option value="head_light">Head Light</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="racket-stiffness">Stiffness</label>
                      <select
                        id="racket-stiffness"
                        value={racketStiffness}
                        onChange={(e) => setRacketStiffness(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">Select...</option>
                        <option value="stiff">Stiff</option>
                        <option value="medium">Medium</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="strings">Strings</label>
                      <Input
                        id="strings"
                        value={strings}
                        onChange={(e) => setStrings(e.target.value)}
                        placeholder="e.g. BG66"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="tension">Tension</label>
                      <Input
                        id="tension"
                        value={tension}
                        onChange={(e) => setTension(e.target.value)}
                        placeholder="e.g. 26 lbs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="shoes">Shoes</label>
                      <Input
                        id="shoes"
                        value={shoes}
                        onChange={(e) => setShoes(e.target.value)}
                        placeholder="e.g. Court shoes"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                id="want-create-club"
                type="checkbox"
                checked={wantCreateClub}
                onChange={(e) => setWantCreateClub(e.target.checked)}
                className="h-4 w-4 rounded border-slate-350 text-emerald-700 focus:ring-emerald-700"
              />
              <label htmlFor="want-create-club" className="text-sm font-semibold text-slate-700 select-none">
                I want to create a new club
              </label>
            </div>

            <Button type="submit" fullWidth disabled={!isSupabaseConfigured || isSubmitting}>
              <UserPlus size={17} aria-hidden="true" />
              {isSubmitting ? 'Creating account...' : 'Sign up'}
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

function getInviteTokenFromRedirect(redirectTo: string) {
  const match = redirectTo.match(/^\/(?:invite|join)\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]).trim().toUpperCase() : null
}
