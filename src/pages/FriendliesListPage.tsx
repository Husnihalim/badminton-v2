import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trophy, Clock, Users } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { listClubCompetitions } from '../lib/api/competitions'
import { getMyClubs, getClub, getClubs } from '../lib/api/clubs'
import { CreateCompetitionModal } from '../components/competition/CreateCompetitionModal'
import type { Competition } from '../types/competition'
import type { Club } from '../types'

export default function FriendliesListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlClubId = searchParams.get('clubId')

  const [currentClub, setCurrentClub] = useState<Club | null>(null)
  const [myClubs, setMyClubs] = useState<(Club & { role: string })[]>([])
  const [allClubs, setAllClubs] = useState<Club[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  async function loadCompetitions(clubId: string) {
    setIsLoading(true)
    const { competitions: data } = await listClubCompetitions(clubId)
    if (data) setCompetitions(data)
    setIsLoading(false)
  }

  useEffect(() => {
    async function load() {
      try {
        const clubsData = await getMyClubs()
        setMyClubs(clubsData)

        let activeClub: Club | null = null
        if (urlClubId) {
          const matched = clubsData.find(c => c.id === urlClubId)
          activeClub = matched || await getClub(urlClubId)
        } else if (clubsData.length > 0) {
          activeClub = clubsData[0]
        }

        setCurrentClub(activeClub)
        if (activeClub) await loadCompetitions(activeClub.id)
        else setIsLoading(false)

        const clubs = await getClubs()
        setAllClubs(clubs)
      } catch {
        setIsLoading(false)
      }
    }
    load()
  }, [urlClubId])

  const active = competitions.filter(c => ['registration', 'matchmaking', 'live'].includes(c.status))
  const completed = competitions.filter(c => c.status === 'completed')

  const displayName = (c: Competition) => {
    // Extract opponent club names from the title
    const prefix = `${currentClub?.name} vs `
    if (c.title.startsWith(prefix)) {
      return c.title.slice(prefix.length)
    }
    return c.title
  }

  const getStatusBadge = (c: Competition) => {
    if (c.invitationStatus === 'invited') {
      return <Badge variant="muted"><Clock size={12} className="mr-1" /> Pending Invitation</Badge>
    }
    switch (c.status) {
      case 'registration':
        return <Badge variant="muted"><Clock size={12} className="mr-1" /> Setting Up</Badge>
      case 'matchmaking':
        return <Badge variant="blue"><Users size={12} className="mr-1" /> Matchmaking</Badge>
      case 'live':
        return <Badge variant="live">● Live</Badge>
      case 'completed': {
        const won = c.winning_club_id === currentClub?.id
        return <Badge variant={won ? 'live' : 'muted'}>{won ? '✓ Won' : '✗ Lost'}</Badge>
      }
      default:
        return <Badge variant="muted">{c.status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--arena-bg)]">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--arena-bg)] p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="arena-heading text-2xl">Competitions</h1>
          {myClubs.length > 1 && (
            <select
              value={currentClub?.id || ''}
              onChange={(e) => {
                const matched = myClubs.find(c => c.id === e.target.value)
                if (matched) {
                  setCurrentClub(matched)
                  loadCompetitions(matched.id)
                }
              }}
              className="rounded-md border border-white/10 bg-white/5 p-1 text-sm text-white focus:border-[var(--arena-lime)]"
            >
              {myClubs.map(c => (
                <option key={c.id} value={c.id} className="bg-[var(--arena-surface)]">{c.name}</option>
              ))}
            </select>
          )}
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 w-10 p-0 sm:w-auto sm:px-4 sm:py-2 gap-2 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
          title="New Competition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {active.length > 0 && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active ({active.length})
          </p>
          {active.map(c => (
            <Card key={c.id} className="cursor-pointer border-white/10 bg-[var(--arena-surface)] transition-colors hover:border-white/20"
              onClick={() => navigate(`/competition/${c.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1">{getStatusBadge(c)}</div>
                    <p className="font-bold text-white">vs {displayName(c)}</p>
                    <p className="text-xs text-slate-400">
                      {c.format === 'league' ? 'League' : 'Friendly'} • {c.pairs_count} pairs • {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            History ({completed.length})
          </p>
          {completed.map(c => (
            <Card key={c.id} className="cursor-pointer border-white/10 bg-[var(--arena-surface)] transition-colors hover:border-white/20"
              onClick={() => navigate(`/competition/${c.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1">{getStatusBadge(c)}</div>
                    <p className="font-bold text-white">vs {displayName(c)}</p>
                    <p className="text-xs text-slate-400">
                      {c.format === 'league' ? 'League' : 'Friendly'} • {c.pairs_count} pairs
                    </p>
                  </div>
                  {c.winning_club_id && (
                    <div className={`text-2xl font-bold ${c.winning_club_id === currentClub?.id ? 'text-[var(--arena-lime)]' : 'text-slate-500'}`}>
                      {c.winning_club_id === currentClub?.id ? 'W' : 'L'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {competitions.length === 0 && (
        <Card className="border-white/10 bg-[var(--arena-surface)]">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Trophy size={32} className="text-slate-600" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">No Competitions Yet</h2>
            <p className="mb-4 text-slate-400">Challenge another club or start a league</p>
            <Button onClick={() => setIsCreateModalOpen(true)}
              className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90">
              New Competition
            </Button>
          </CardContent>
        </Card>
      )}

      {currentClub && (
        <CreateCompetitionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          myClubId={currentClub.id}
          myClubName={currentClub.name}
          allClubs={allClubs}
          onCreated={(id) => {
            loadCompetitions(currentClub.id)
            navigate(`/competition/${id}`)
          }}
        />
      )}
    </div>
  )
}
