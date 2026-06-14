import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { 
  getCompetitionByInviteCode,
  getCompetitionParticipants, 
  getCompetitionMatchups,
  getCompetitionPools
} from '../lib/api/competitions'
import type { 
  Competition, 
  CompetitionParticipant, 
  CompetitionMatchup,
  CompetitionPool 
} from '../types/competition'
import { cn } from '../lib/utils'

export default function PublicCompetitionPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useNotifications()

  // State
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  const [matchups, setMatchups] = useState<CompetitionMatchup[]>([])
  const [pools, setPools] = useState<CompetitionPool[]>([])
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
        { pools: poolData }
      ] = await Promise.all([
        getCompetitionParticipants(compData.id),
        getCompetitionMatchups(compData.id),
        getCompetitionPools(compData.id)
      ])

      setParticipants(partsData || [])
      setMatchups(matchData || [])
      setPools(poolData || [])
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

  // Standings computation
  const poolStandings = useMemo(() => {
    const standingsMap: Record<string, {
      participantId: string
      name: string
      played: number
      wins: number
      losses: number
      setsWon: number
      setsLost: number
      pointsWon: number
      pointsLost: number
    }> = {}

    participants.forEach(p => {
      standingsMap[p.id] = {
        participantId: p.id,
        name: p.name,
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

      let setsWonA = 0
      let setsWonB = 0
      let ptsWonA = 0
      let ptsWonB = 0

      m.match.score_sets.forEach(set => {
        ptsWonA += set.team1_score
        ptsWonB += set.team2_score
        if (set.team1_score > set.team2_score) setsWonA += 1
        else if (set.team2_score > set.team1_score) setsWonB += 1
      })

      pA.setsWon += setsWonA
      pA.setsLost += setsWonB
      pA.pointsWon += ptsWonA
      pA.pointsLost += ptsWonB

      pB.setsWon += setsWonB
      pB.setsLost += setsWonA
      pB.pointsWon += ptsWonB
      pB.pointsLost += ptsWonA

      if (m.winner_participant_id === m.participant_a_id) {
        pA.wins += 1
        pB.losses += 1
      } else {
        pB.wins += 1
        pA.losses += 1
      }
    })

    type Standing = typeof standingsMap[string]
    const grouped: Record<string, Standing[]> = {}
    participants.forEach(p => {
      const poolId = p.pool_id || 'unassigned'
      if (!grouped[poolId]) grouped[poolId] = []
      
      const stats: Standing = standingsMap[p.id] || {
        participantId: p.id,
        name: p.name,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0
      }
      grouped[poolId].push(stats)
    })

    Object.keys(grouped).forEach(poolId => {
      grouped[poolId].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        const setDiffA = a.setsWon - a.setsLost
        const setDiffB = b.setsWon - b.setsLost
        if (setDiffB !== setDiffA) return setDiffB - setDiffA
        const ptsDiffA = a.pointsWon - a.pointsLost
        const ptsDiffB = b.pointsWon - b.pointsLost
        return ptsDiffB - ptsDiffA
      })
    })

    return grouped
  }, [participants, matchups])

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
    <div className="min-h-screen bg-[#040d0f] text-white p-4 pb-20">
      {/* Brand Header */}
      <div className="mx-auto max-w-2xl text-center pt-4 mb-6">
        <span className="text-xs font-black tracking-wider uppercase text-[var(--arena-lime)]">
          🏸 Grassroots Sports Broadcast
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-1 leading-none">
          {competition.title}
        </h1>
        <p className="text-xs text-[var(--arena-text-muted)] mt-1.5 uppercase tracking-wider">
          Hosted by: {competition.club?.name}
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
            {matchups.map((m, index) => (
              <Card key={m.id} className="border-white/10 bg-[#0a0f0e]">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Match {index + 1} • Court {m.order_index + 1}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={cn(
                        "font-black text-base transition-colors",
                        m.winner_participant_id === m.participant_a_id ? 'text-[var(--arena-lime)]' : 'text-white'
                      )}>
                        {m.participant_a?.name}
                      </span>
                      <span className="text-slate-500 text-xs font-mono">vs</span>
                      <span className={cn(
                        "font-black text-base transition-colors",
                        m.winner_participant_id === m.participant_b_id ? 'text-[var(--arena-lime)]' : 'text-white'
                      )}>
                        {m.participant_b?.name}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {m.status === 'completed' && m.match?.score_sets ? (
                      <div className="flex gap-2">
                        {m.match.score_sets.map((set, sIdx) => (
                          <div key={sIdx} className="bg-slate-950 border border-white/5 px-2.5 py-1 rounded text-sm font-mono font-bold">
                            <span className={set.team1_score > set.team2_score ? 'text-[var(--arena-lime)]' : 'text-white'}>
                              {set.team1_score}
                            </span>
                            <span className="text-slate-650 mx-1">-</span>
                            <span className={set.team2_score > set.team1_score ? 'text-[var(--arena-lime)]' : 'text-white'}>
                              {set.team2_score}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="live">LIVE</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Standings */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            {(pools.length > 0 ? pools : [{ id: 'unassigned', name: 'General Standings' }]).map(pool => {
              const standingList = poolStandings[pool.id] || []
              return (
                <div key={pool.id} className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--arena-lime)] uppercase tracking-wider">
                    {pool.name}
                  </h3>
                  <Card className="border-white/10 bg-[#0a0f0e] overflow-hidden">
                    <CardContent className="p-0">
                      <table className="w-full text-left text-xs">
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
                              <td className="py-3 px-4 font-bold text-white">{st.name}</td>
                              <td className="py-3 px-4 text-center font-semibold">{st.played}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-emerald-400">{st.wins}</td>
                              <td className="py-3 px-4 text-center font-mono text-slate-400">
                                {st.setsWon} - {st.setsLost}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                  <h4 className="font-extrabold text-white text-base leading-tight">{p.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Rostered Pair</p>
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
                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center justify-center gap-1.5">
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
