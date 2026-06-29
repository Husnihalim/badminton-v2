import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, LogIn, UserPlus } from 'lucide-react'
import { joinClubByInviteLinkToken } from '../lib/api/clubs'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'

const pendingInviteKey = 'kelabsukan.pendingInviteLinkToken'
const postLoginRedirectKey = 'kelabsukan.postLoginRedirect'

function getInviteRedirect(inviteToken: string) {
  return `/invite/${encodeURIComponent(inviteToken)}`
}

export default function InviteJoinPage() {
  const { inviteToken = '', inviteCode = '' } = useParams()
  const normalizedInviteToken = (inviteToken || inviteCode).trim().toUpperCase()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'joining' | 'joined' | 'pending' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!normalizedInviteToken) return

    if (!isLoading && !user) {
      window.localStorage.setItem(pendingInviteKey, normalizedInviteToken)
      window.localStorage.setItem(postLoginRedirectKey, getInviteRedirect(normalizedInviteToken))
    }
  }, [normalizedInviteToken, isLoading, user])

  useEffect(() => {
    if (isLoading || !user || !normalizedInviteToken || status !== 'idle') return

    const joinByInvite = async () => {
      try {
        setStatus('joining')
        const membership = await joinClubByInviteLinkToken(normalizedInviteToken)
        window.localStorage.removeItem(pendingInviteKey)
        window.localStorage.removeItem(postLoginRedirectKey)
        if (membership?.status === 'active') {
          setStatus('joined')
          setMessage('You joined the club from a specific invite link.')
          const target = membership.club_id
            ? `/club/${encodeURIComponent(membership.club_id)}?celebrate=true`
            : '/dashboard'
          setTimeout(() => navigate(target), 1200)
          return
        }

        setStatus('pending')
        setMessage('Join request sent. A club admin will review and approve it.')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not join from this invite link.')
      }
    }

    joinByInvite()
  }, [isLoading, user, normalizedInviteToken, navigate, status])

  const redirect = getInviteRedirect(normalizedInviteToken)
  const authQuery = `?redirect=${encodeURIComponent(redirect)}`

  if (isLoading || status === 'joining') {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--arena-accent)]">Club invite</p>
            <h1 className="text-2xl font-bold leading-tight text-[var(--arena-text)]">Join with invite link</h1>
            <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--arena-accent)]">Club invite</p>
          <h1 className="text-2xl font-bold leading-tight text-[var(--arena-text)]">
            {status === 'joined' ? 'Joined club' : status === 'pending' ? 'Request sent' : 'Invite link issue'}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={`rounded-lg border p-3 text-sm ${status === 'joined' || status === 'pending' ? 'border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {status === 'joined' || status === 'pending' ? <CheckCircle2 className="mr-1 inline" size={16} aria-hidden="true" /> : null}
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
