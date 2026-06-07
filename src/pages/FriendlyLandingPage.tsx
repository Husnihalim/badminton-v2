import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trophy, Users, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { getFriendlyByInviteCode, acceptFriendly } from '../lib/friendlyApi'
import { useAuth } from '../context/AuthContext'
import type { Friendly } from '../types/friendly'

export function FriendlyLandingPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [friendly, setFriendly] = useState<Friendly | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    if (!inviteCode) return

    loadFriendly()
  }, [inviteCode])

  const loadFriendly = async () => {
    setIsLoading(true)
    const { friendly, error } = await getFriendlyByInviteCode(inviteCode!)
    
    if (error) {
      setError('Invalid or expired invite link')
    } else if (friendly?.status !== 'pending') {
      setError('This challenge has already been responded to')
    } else {
      setFriendly(friendly)
    }
    
    setIsLoading(false)
  }

  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?returnTo=/f/${inviteCode}`)
      return
    }

    // If user has clubs, show club selection (simplified for now)
    // For MVP, we'll need to handle club selection or creation
    navigate(`/friendly/accept/${inviteCode}`)
  }

  const handleLogin = () => {
    navigate(`/login?returnTo=/f/${inviteCode}`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040d0f]">
        <div className="text-[var(--arena-lime)]">Loading...</div>
      </div>
    )
  }

  if (error || !friendly) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040d0f] p-4">
        <Card className="w-full max-w-md border-white/10 bg-[#0a0f0e]">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">{error || 'Something went wrong'}</p>
            <Button
              onClick={() => navigate('/')}
              className="mt-4 bg-[var(--arena-lime)] text-black"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#040d0f] p-4">
      <div className="mx-auto max-w-md pt-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="arena-heading text-2xl text-[var(--arena-lime)]">KelabSukan</h1>
        </div>

        {/* Inviting Club Card */}
        <Card className="mb-6 border-white/10 bg-[#0a0f0e]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl">
                🏸
              </div>
              <div>
                <p className="text-lg font-bold text-white">{friendly.inviting_club?.name}</p>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <MapPin size={14} />
                  {friendly.inviting_club?.city}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Challenge Message */}
        <p className="mb-6 text-center text-xl text-white">
          wants to play you!
        </p>

        {/* Challenge Details */}
        <Card className="mb-6 border-[var(--arena-lime)]/30 bg-[#0a0f0e]">
          <CardContent className="p-6">
            <Badge variant="live" className="mb-4">
              Friendly Challenge
            </Badge>
            
            <h2 className="arena-heading mb-2 text-2xl">
              Friday Night Friendly
            </h2>
            
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[var(--arena-lime)]" />
                <span>{friendly.pair_count} pairs • 1 set per match</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[var(--arena-lime)]" />
                <span>21 points, win by 2</span>
              </div>
              <p className="pt-2 text-sm text-slate-400">
                Most pair wins takes the friendly. Bragging rights on the line.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="mb-4 w-full gap-2 bg-[var(--arena-lime)] py-6 text-lg font-bold text-black hover:bg-[var(--arena-lime)]/90"
        >
          {isAccepting ? 'Processing...' : 'Accept Challenge'}
          <ArrowRight size={20} />
        </Button>

        <p className="mb-6 text-center text-sm text-slate-400">
          {user ? 'Select your club to accept' : 'Create your club to accept (takes 2 minutes)'}
        </p>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#040d0f] px-4 text-xs text-slate-500">OR</span>
          </div>
        </div>

        {/* Login Option */}
        {!user && (
          <Button
            onClick={handleLogin}
            variant="outline"
            className="mb-4 w-full border-white/10"
          >
            Already on KelabSukan? Log in
          </Button>
        )}

        {/* Learn More */}
        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-sm text-slate-400 hover:text-[var(--arena-lime)]"
        >
          Learn more about KelabSukan
        </button>
      </div>
    </div>
  )
}
