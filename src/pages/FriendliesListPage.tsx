import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trophy, Clock, Users } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { listClubFriendlies } from '../lib/api/competitions'
import { getMyClubs, getClub, getClubs } from '../lib/api'
import type { Friendly } from '../types/competition'
import type { Club } from '../types'
import { FriendlyCreateModal } from '../components/friendly'

export default function FriendliesListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlClubId = searchParams.get('clubId')

  const [currentClub, setCurrentClub] = useState<Club | null>(null)
  const [myClubs, setMyClubs] = useState<(Club & { role: string })[]>([])
  const [discoverClubs, setDiscoverClubs] = useState<Club[]>([])
  const [friendlies, setFriendlies] = useState<Friendly[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  async function loadFriendlies(clubId: string) {
    setIsLoading(true)
    const { friendlies: data, error } = await listClubFriendlies(clubId)
    if (!error && data) {
      setFriendlies(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    async function loadClubs() {
      try {
        const clubsData = await getMyClubs()
        setMyClubs(clubsData)
        
        let activeClub: Club | null = null
        if (urlClubId) {
          const matched = clubsData.find(c => c.id === urlClubId)
          if (matched) {
            activeClub = matched
          } else {
            const club = await getClub(urlClubId)
            if (club) activeClub = club
          }
        } else if (clubsData.length > 0) {
          activeClub = clubsData[0]
        }
        
        setCurrentClub(activeClub)
        if (activeClub) {
          await loadFriendlies(activeClub.id)
        } else {
          setIsLoading(false)
        }
      } catch (err) {
        console.error(err)
        setIsLoading(false)
      }
    }
    loadClubs()
  }, [urlClubId])

  useEffect(() => {
    if (!currentClub) return
    getClubs()
      .then((clubs) => {
        setDiscoverClubs(clubs.filter((c) => c.id !== currentClub.id))
      })
      .catch(console.error)
  }, [currentClub])

  const activeFriendlies = friendlies.filter((f) => ['pending', 'accepted', 'matchmaking', 'live'].includes(f.status))
  const completedFriendlies = friendlies.filter((f) => f.status === 'completed')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--arena-bg)]">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--arena-bg)] p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="arena-heading text-2xl">Friendlies</h1>
          {myClubs.length > 1 && (
            <select
              value={currentClub?.id || ''}
              onChange={(e) => {
                const matched = myClubs.find(c => c.id === e.target.value)
                if (matched) {
                  setCurrentClub(matched)
                  loadFriendlies(matched.id)
                }
              }}
              className="rounded-md border border-white/10 bg-white/5 p-1 text-sm text-white focus:border-[var(--arena-lime)]"
            >
              {myClubs.map(c => (
                <option key={c.id} value={c.id} className="bg-[var(--arena-surface)]">
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 w-10 p-0 sm:w-auto sm:px-4 sm:py-2 gap-2 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
          title="Challenge a Club"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {/* Active Friendlies */}
      {activeFriendlies.length > 0 && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active ({activeFriendlies.length})
          </p>
          {activeFriendlies.map((friendly) => (
            <FriendlyCard
              key={friendly.id}
              friendly={friendly}
              currentClubId={currentClub?.id}
              onClick={() => navigate(`/friendly/${friendly.id}`)}
            />
          ))}
        </div>
      )}

      {/* Completed Friendlies */}
      {completedFriendlies.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            History ({completedFriendlies.length})
          </p>
          {completedFriendlies.map((friendly) => (
            <FriendlyCard
              key={friendly.id}
              friendly={friendly}
              currentClubId={currentClub?.id}
              onClick={() => navigate(`/friendly/${friendly.id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {friendlies.length === 0 && (
        <Card className="border-white/10 bg-[var(--arena-surface)]">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Trophy size={32} className="text-slate-600" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">No Friendlies Yet</h2>
            <p className="mb-4 text-slate-400">
              Challenge another club to a friendly match and build your rivalry history
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
            >
              Challenge a Club
            </Button>
          </CardContent>
        </Card>
      )}

      {currentClub && (
        <FriendlyCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          clubId={currentClub.id}
          nearbyClubs={discoverClubs}
          onCreated={() => {
            loadFriendlies(currentClub.id)
          }}
        />
      )}
    </div>
  )
}

interface FriendlyCardProps {
  friendly: Friendly
  currentClubId?: string
  onClick: () => void
}

function FriendlyCard({ friendly, currentClubId, onClick }: FriendlyCardProps) {
  const isInviting = currentClubId === friendly.inviting_club_id
  const opponentName = isInviting
    ? (friendly.invited_club?.name || friendly.invited_club_name)
    : (friendly.inviting_club?.name || '')

  const getStatusBadge = () => {
    switch (friendly.status) {
      case 'pending':
        return <Badge variant="muted"><Clock size={12} className="mr-1" /> Pending</Badge>
      case 'accepted':
        return <Badge variant="blue"><Users size={12} className="mr-1" /> Setting Up</Badge>
      case 'matchmaking':
        return <Badge variant="heat">Matchmaking</Badge>
      case 'live':
        return <Badge variant="live">● Live</Badge>
      case 'completed': {
        const won = friendly.winning_club_id === currentClubId
        return <Badge variant={won ? 'live' : 'muted'}>{won ? '✓ Won' : '✗ Lost'}</Badge>
      }
      default:
        return <Badge variant="muted">{friendly.status}</Badge>
    }
  }

  return (
    <Card
      className="cursor-pointer border-white/10 bg-[var(--arena-surface)] transition-colors hover:border-white/20"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              {getStatusBadge()}
            </div>
            <p className="font-bold text-white">
              vs {opponentName}
            </p>
            <p className="text-xs text-slate-400">
              {friendly.pair_count} pairs • {new Date(friendly.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            {friendly.status === 'completed' && friendly.winning_club_id && (
              <div className={`text-2xl font-bold ${friendly.winning_club_id === currentClubId ? 'text-[var(--arena-lime)]' : 'text-slate-500'}`}>
                {friendly.winning_club_id === currentClubId ? 'W' : 'L'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
