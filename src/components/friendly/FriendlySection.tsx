import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Users, ArrowRight, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { listClubFriendlies, getClubFriendlyStats } from '../../lib/friendlyApi'
import type { Friendly } from '../../types/friendly'

interface FriendlySectionProps {
  clubId: string
  isAdmin: boolean
}

export function FriendlySection({ clubId, isAdmin }: FriendlySectionProps) {
  const navigate = useNavigate()
  const [friendlies, setFriendlies] = useState<Friendly[]>([])
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, winRate: 0 })
  const [isLoading, setIsLoading] = useState(true)



  async function loadFriendlies() {
    setIsLoading(true)
    const [{ friendlies: data }, { total, wins, losses, winRate }] = await Promise.all([
      listClubFriendlies(clubId),
      getClubFriendlyStats(clubId),
    ])
    
    if (data) {
      // Get active and recent completed friendlies
      const active = data.filter(f => ['pending', 'accepted', 'matchmaking', 'live'].includes(f.status))
      const recentCompleted = data
        .filter(f => f.status === 'completed')
        .slice(0, 3)
      setFriendlies([...active, ...recentCompleted])
    }
    
    setStats({ total, wins, losses, winRate })
    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFriendlies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-[var(--arena-surface)]">
        <CardContent className="p-4">
          <p className="text-slate-400">Loading friendlies...</p>
        </CardContent>
      </Card>
    )
  }

  const activeFriendly = friendlies.find(f => ['live', 'matchmaking', 'accepted'].includes(f.status))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Friendlies</h2>
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
            onClick={() => navigate('/friendlies')}
          >
            <Plus size={14} />
            Challenge
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-2xl font-bold text-[var(--arena-lime)]">{stats.total}</p>
            <p className="text-xs text-slate-400">Played</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.wins}</p>
            <p className="text-xs text-slate-400">Wins</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.winRate}%</p>
            <p className="text-xs text-slate-400">Win Rate</p>
          </div>
        </div>
      )}

      {/* Active Friendly */}
      {activeFriendly && (
        <Card 
          className="cursor-pointer border-[var(--arena-lime)]/30 bg-[var(--arena-surface)] transition-colors hover:border-[var(--arena-lime)]/50"
          onClick={() => navigate(`/friendly/${activeFriendly.id}`)}
        >
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="live">
                {activeFriendly.status === 'live' ? '● LIVE' : activeFriendly.status}
              </Badge>
              <ArrowRight size={16} className="text-slate-400" />
            </div>
            <p className="font-bold text-white">
              vs {activeFriendly.invited_club?.name || activeFriendly.invited_club_name}
            </p>
            <p className="text-sm text-slate-400">
              {activeFriendly.pair_count} pairs • {activeFriendly.status === 'live' ? 'In progress' : 'Setting up'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      {friendlies.filter(f => f.status === 'completed').length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Recent</p>
          {friendlies
            .filter(f => f.status === 'completed')
            .slice(0, 3)
            .map(friendly => {
              const isWin = friendly.winning_club_id === clubId
              const opponent = friendly.inviting_club_id === clubId
                ? friendly.invited_club?.name || friendly.invited_club_name
                : friendly.inviting_club?.name
              
              return (
                <Card
                  key={friendly.id}
                  className="cursor-pointer border-white/10 bg-white/5 transition-colors hover:border-white/20"
                  onClick={() => navigate(`/friendly/${friendly.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <span className={isWin ? 'text-[var(--arena-lime)]' : 'text-slate-500'}>
                        {isWin ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-white">vs {opponent}</span>
                    </div>
                    <Badge variant={isWin ? 'live' : 'muted'}>
                      {isWin ? 'Won' : 'Lost'}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}

      {/* Empty State */}
      {friendlies.length === 0 && isAdmin && (
        <Card className="border-white/10 bg-[var(--arena-surface)]">
          <CardContent className="p-6 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                <Trophy size={24} className="text-slate-600" />
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-400">
              Challenge other clubs to friendly matches and build your rivalry history
            </p>
            <Button
              type="button"
              onClick={() => navigate('/friendlies')}
              className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
            >
              <Users size={16} className="mr-2" />
              Challenge a Club
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
