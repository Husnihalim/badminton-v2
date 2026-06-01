import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, LogIn, UserPlus } from 'lucide-react'
import { joinClubByInviteCode } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'

const pendingInviteKey = 'kelabsukan.pendingInviteCode'
const postLoginRedirectKey = 'kelabsukan.postLoginRedirect'

function getInviteRedirect(inviteCode: string) {
  return `/join/${encodeURIComponent(inviteCode)}`
}

export default function InviteJoinPage() {
  const { inviteCode = '' } = useParams()
  const normalizedCode = inviteCode.trim().toUpperCase()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'joining' | 'joined' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!normalizedCode) return

    if (!isLoading && !user) {
      window.localStorage.setItem(pendingInviteKey, normalizedCode)
      window.localStorage.setItem(postLoginRedirectKey, getInviteRedirect(normalizedCode))
    }
  }, [normalizedCode, isLoading, user])

  useEffect(() => {
    if (isLoading || !user || !normalizedCode || status !== 'idle') return

    const joinByInvite = async () => {
      try {
        setStatus('joining')
        await joinClubByInviteCode(normalizedCode)
        window.localStorage.removeItem(pendingInviteKey)
        window.localStorage.removeItem(postLoginRedirectKey)
        setStatus('joined')
        setMessage('You joined the club from the invite link.')
        setTimeout(() => navigate('/dashboard'), 1200)
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not join from this invite link.')
      }
    }

    joinByInvite()
  }, [isLoading, user, normalizedCode, navigate, status])

  const redirect = getInviteRedirect(normalizedCode)
  const authQuery = `?redirect=${encodeURIComponent(redirect)}`

  if (isLoading || status === 'joining') {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardContent className="pt-5 text-center text-sm text-slate-600">
          {isLoading ? 'Checking your session...' : 'Joining club...'}
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <section className="mx-auto mt-4 max-w-md sm:mt-10">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Club invite</p>
            <h1 className="text-2xl font-bold leading-tight text-slate-950">Join with invite link</h1>
            <p className="text-sm leading-6 text-slate-600">
              Log in or create an account first. This invite will continue after authentication.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link to={`/register${authQuery}`}>
              <Button fullWidth>
                <UserPlus size={17} aria-hidden="true" />
                Create account
              </Button>
            </Link>
            <Link to={`/login${authQuery}`}>
              <Button fullWidth variant="secondary">
                <LogIn size={17} aria-hidden="true" />
                Log in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto mt-4 max-w-md sm:mt-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Club invite</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-950">
            {status === 'joined' ? 'Joined club' : 'Invite link issue'}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={`rounded-lg border p-3 text-sm ${status === 'joined' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {status === 'joined' ? <CheckCircle2 className="mr-1 inline" size={16} aria-hidden="true" /> : null}
            {message}
          </p>
          <Button onClick={() => navigate('/dashboard')} fullWidth>
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
