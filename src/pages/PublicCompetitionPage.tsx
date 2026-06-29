import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import BwfMatchupCard from '../components/competition/BwfMatchupCard'
import { 
  getCompetitionByInviteCode,
  getCompetitionParticipants, 
  getCompetitionMatchups,
  getCompetitionClubs
} from '../lib/api/competitions'
import type { 
  Competition, 
  CompetitionClub,
  CompetitionParticipant, 
  CompetitionMatchup,
} from '../types/competition'
import { cn } from '../lib/utils'

type StandingRow = {
  participantId: string
  name: string
  clubId: string | null
  participant: CompetitionParticipant
  played: number
  wins: number
  losses: number
  setsWon: number
  setsLost: number
  pointsWon: number
  pointsLost: number
}

export default function PublicCompetitionPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useNotifications()

  // State
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  const [matchups, setMatchups] = useState<CompetitionMatchup[]>([])
  const [compClubs, setCompClubs] = useState<CompetitionClub[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'roster'>('matches')

  async function loadData() {
    if (!inviteCode) return
    setIsLoading(true)
    try {
      const { competition: compData, error: compError } = await getCompetitionByInviteCode(inviteCode)
      if (compError || !compData) {
        showToast('Invalid or expired competition link', 'error')
        return
      }

      setCompetition(compData)

      const [
        { participants: partsData },
        { matchups: matchData },
        { clubs: clubsData }
      ] = await Promise.all([
        getCompetitionParticipants(compData.id),
        getCompetitionMatchups(compData.id),
        getCompetitionClubs(compData.id)
      ])

      setParticipants(partsData || [])
      setMatchups(matchData || [])
      setCompClubs(clubsData || [])
    } catch (err) {
      console.error('Failed to load public competition details:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode])

  // Standings computation (grouped by club)
  const clubStandings = useMemo(() => {
    const standingsMap: Record<string, StandingRow> = {}

    participants.forEach(p => {
      standingsMap[p.id] = {
        participantId: p.id,
        name: p.name,
        clubId: p.club_id,
        participant: p,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0
      }
    })

    matchups.forEach(m => {
      if (m.status !== 'completed' || !m.match?.score_sets?.length) return

      const pA = standingsMap[m.participant_a_id]
      const pB = standingsMap[m.participant_b_id]

      if (!pA || !pB) return

      pA.played += 1
      pB.played += 1

      let setsWonA = 0, setsWonB = 0, ptsWonA = 0, ptsWonB = 0

      m.match.score_sets.forEach(set => {
        ptsWonA += set.team1_score
        ptsWonB += set.team2_score
        if (set.team1_score > set.team2_score) setsWonA += 1
        else if (set.team2_score > set.team1_score) setsWonB += 1
      })

      pA.setsWon += setsWonA; pA.setsLost += setsWonB
      pA.pointsWon += ptsWonA; pA.pointsLost += ptsWonB

      pB.setsWon += setsWonB; pB.setsLost += setsWonA
      pB.pointsWon += ptsWonB; pB.pointsLost += ptsWonA

      if (m.winner_participant_id === m.participant_a_id) {
        pA.wins += 1; pB.losses += 1
      } else {
        pB.wins += 1; pA.losses += 1
      }
    })

    // Group by club
    const grouped: Record<string, StandingRow[]> = {}
    for (const p of participants) {
      const clubId = p.club_id || 'unassigned'
      if (!grouped[clubId]) grouped[clubId] = []
      const stats = standingsMap[p.id] || {
        participantId: p.id, name: p.name, clubId: p.club_id,
        participant: p,
        played: 0, wins: 0, losses: 0,
        setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0,
      }
      grouped[clubId].push(stats)
    }

    for (const clubId of Object.keys(grouped)) {
      grouped[clubId].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        const setDiffA = a.setsWon - a.setsLost
        const setDiffB = b.setsWon - b.setsLost
        if (setDiffB !== setDiffA) return setDiffB - setDiffA
        const ptsDiffA = a.pointsWon - a.pointsLost
        const ptsDiffB = b.pointsWon - b.pointsLost
        return ptsDiffB - ptsDiffA
      })
    }

    return grouped
  }, [participants, matchups])

  const clubNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const cc of compClubs) {
      map.set(cc.club_id, cc.club?.name || 'Unknown Club')
    }
    return map
  }, [compClubs])

  const participantLinkClass = "rounded-sm font-bold text-white underline-offset-4 hover:text-[var(--arena-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--arena-blue)]/70"

  const renderParticipantLinks = (participant: CompetitionParticipant) => {
    const playerOneName = participant.player_1?.display_name || participant.player_1?.name
    const playerTwoName = participant.player_2?.display_name || participant.player_2?.name

    if (!playerOneName && !playerTwoName) {
      if (participant.user_1_id) {
        return (
          <Link to={`/member/${participant.user_1_id}`} className={participantLinkClass} title={`View ${participant.name}`}>
            {participant.name}
          </Link>
        )
      }
      return <span className="font-bold text-white">{participant.name}</span>
    }

    return (
      <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
        {participant.user_1_id && playerOneName ? (
          <Link to={`/member/${participant.user_1_id}`} className={participantLinkClass} title={`View ${playerOneName}`}>
            {playerOneName}
          </Link>
        ) : (
          <span className="font-bold text-white">{playerOneName || participant.name}</span>
        )}
        {playerTwoName && (
          <>
            <span className="text-slate-500">&</span>
            {participant.user_2_id ? (
              <Link to={`/member/${participant.user_2_id}`} className={participantLinkClass} title={`View ${playerTwoName}`}>
                {playerTwoName}
              </Link>
            ) : (
              <span className="font-bold text-white">{playerTwoName}</span>
            )}
          </>
        )}
      </span>
    )
  }

  const renderClubLink = (clubId: string | null | undefined, clubName: string | undefined, fallback = 'General Standings') => {
    const label = clubName || fallback
    if (!clubId || clubId === 'unassigned' || !clubName) return <span>{label}</span>
    return (
      <Link
        to={`/club/${clubId}`}
        className="rounded-sm underline-offset-4 hover:text-[var(--arena-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--arena-blue)]/70"
        title={`View ${label}`}
      >
        {label}
      </Link>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040d0f]">
        <p className="text-slate-400">Loading public scoreboard...</p>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040d0f] p-4">
        <Card className="w-full max-w-md border-white/10 bg-[#0a0f0e]">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-red-400 font-bold">Invalid or expired invite link.</p>
            <Button onClick={() => navigate('/')} className="bg-[var(--arena-lime)] text-black">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#040d0f] p-3 pb-20 text-white sm:p-4">
      {/* Brand Header */}
      <div className="mx-auto max-w-2xl text-center pt-4 mb-6">
        <span className="text-xs font-black tracking-wider uppercase text-[var(--arena-lime)]">
          🏸 Grassroots Sports Broadcast
        </span>
        <h1 className="mt-1 break-words text-2xl font-black uppercase tracking-tight text-white leading-tight sm:text-3xl">
          {competition.title}
        </h1>
        <p className="mt-1.5 break-words text-xs uppercase tracking-wider text-[var(--arena-text-muted)]">
          Hosted by:{' '}
          {renderClubLink(competition.club?.id || competition.club_id, competition.club?.name, 'Host Club')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-2xl border-b border-white/10 flex gap-2 overflow-x-auto whitespace-nowrap mb-6">
        {([
          { id: 'matches', label: 'Scoreboard' },
          { id: 'standings', label: 'Standings' },
          { id: 'roster', label: 'Roster' }
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer",
              activeTab === tab.id
                ? 'border-[var(--arena-lime)] text-[var(--arena-lime)]'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Matches Scoreboard */}
        {activeTab === 'matches' && (
          <div className="space-y-3">
            {matchups.map((m) => (
              <BwfMatchupCard
                key={m.id}
                matchup={m}
                isAdmin={false}
                participantClubNames={{
                  a: m.participant_a?.club_id ? clubNameMap.get(m.participant_a.club_id) : undefined,
                  b: m.participant_b?.club_id ? clubNameMap.get(m.participant_b.club_id) : undefined,
                }}
              />
            ))}
            {matchups.length === 0 && (
              <p className="text-slate-500 italic text-sm py-4 text-center">No matches scheduled.</p>
            )}
          </div>
        )}

        {/* Standings */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            {Object.entries(clubStandings).map(([clubId, standingList]) => {
              const clubLabel = clubNameMap.get(clubId) || 'General Standings'
              return (
                <div key={clubId} className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--arena-lime)] uppercase tracking-wider">
                    {renderClubLink(clubId, clubNameMap.get(clubId), clubLabel)}
                  </h3>
                  <Card className="overflow-hidden border-white/10 bg-[#0a0f0e]">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 bg-slate-950/40 text-[var(--arena-text-muted)] font-black uppercase">
                              <th className="py-3 px-4">Rank</th>
                              <th className="py-3 px-4">Player / Pair</th>
                              <th className="py-3 px-4 text-center">Played</th>
                              <th className="py-3 px-4 text-center">Wins</th>
                              <th className="py-3 px-4 text-center">Sets (W/L)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standingList.map((st, sIdx) => (
                              <tr key={st.participantId} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="py-3 px-4 font-extrabold text-[var(--arena-lime)]">#{sIdx + 1}</td>
                                <td className="py-3 px-4">{renderParticipantLinks(st.participant)}</td>
                                <td className="py-3 px-4 text-center font-semibold">{st.played}</td>
                                <td className="py-3 px-4 text-center font-extrabold text-emerald-400">{st.wins}</td>
                                <td className="py-3 px-4 text-center font-mono text-slate-400">
                                  {st.setsWon} - {st.setsLost}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}

        {/* Roster list */}
        {activeTab === 'roster' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {participants.map(p => (
              <Card key={p.id} className="border-white/10 bg-[#0a0f0e]">
                <CardContent className="p-4">
                  <h4 className="break-words text-base font-extrabold leading-tight">
                    {renderParticipantLinks(p)}
                  </h4>
                  <p className="mt-1 text-[10px] font-mono uppercase text-slate-500">
                    {renderClubLink(p.club_id, p.club_id ? clubNameMap.get(p.club_id) : undefined, 'Rostered Pair')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action signup banner */}
        {!user && (
          <Card className="border-[var(--arena-lime)]/30 bg-[#0a0f0e] shadow-[var(--arena-glow)] mt-8">
            <CardContent className="p-6 text-center space-y-4">
              <div className="space-y-1">
                <h3 className="flex items-center justify-center gap-1.5 text-lg font-black uppercase tracking-tight text-white">
                  ⚡ Join the Live Sports Network
                </h3>
                <p className="text-xs text-[var(--arena-text-muted)] leading-relaxed">
                  Want to track your own badminton matches, build a player card, and challenge other local clubs? Create a profile now!
                </p>
              </div>
              <Button
                onClick={() => navigate('/register')}
                className="w-full bg-[var(--arena-lime)] text-black font-bold uppercase py-5 text-sm gap-1.5"
              >
                Sign Up for Free <ExternalLink size={14} />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
