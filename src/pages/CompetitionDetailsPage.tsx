import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, UserPlus, Info, Calendar
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { 
  getCompetition, 
  getCompetitionParticipants, 
  getCompetitionMatchups,
  getCompetitionPools,
  inviteMemberToRoster,
  recordCompetitionMatch,
  completeCompetition
} from '../lib/api/competitions'
import { getClubMembers, getMyClubs } from '../lib/api'
import type { 
  Competition, 
  CompetitionParticipant, 
  CompetitionMatchup,
  CompetitionPool 
} from '../types/competition'
import type { Club, Membership } from '../types'
import { cn } from '../lib/utils'

export default function CompetitionDetailsPage() {
  const { competitionId } = useParams<{ competitionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useNotifications()

  // State
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  const [matchups, setMatchups] = useState<CompetitionMatchup[]>([])
  const [pools, setPools] = useState<CompetitionPool[]>([])
  const [clubMembers, setClubMembers] = useState<Membership[]>([])
  const [opponentMembers, setOpponentMembers] = useState<Membership[]>([])
  const [myClubs, setMyClubs] = useState<Club[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'roster' | 'matches' | 'standings' | 'playoffs'>('details')
  const [selectedPoolId, setSelectedPoolId] = useState<string>('all')

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteUserId, setInviteUserId] = useState('')
  const [invitePartnerId, setInvitePartnerId] = useState('')
  const [inviteClubId, setInviteClubId] = useState<string | null>(null)
  
  const [recordingMatchup, setRecordingMatchup] = useState<CompetitionMatchup | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)

  // Auth checking: Is user admin or owner of hosting/opponent club?
  const isAdmin = useMemo(() => {
    if (!user || !competition) return false
    const myClubMembership = myClubs.find(c => c.id === competition.club_id || c.id === competition.opponent_club_id)
    return !!myClubMembership
  }, [user, competition, myClubs])

  async function loadData() {
    setIsLoading(true)
    try {
      const [
        { competition: compData },
        { participants: partsData },
        { matchups: matchData },
        { pools: poolData },
        myClubsData
      ] = await Promise.all([
        getCompetition(competitionId!),
        getCompetitionParticipants(competitionId!),
        getCompetitionMatchups(competitionId!),
        getCompetitionPools(competitionId!),
        getMyClubs()
      ])

      setMyClubs(myClubsData)

      if (compData) {
        setCompetition(compData)
        setParticipants(partsData || [])
        setMatchups(matchData || [])
        setPools(poolData || [])

        // Load host club members for invitation
        const hostMembers = await getClubMembers(compData.club_id)
        setClubMembers(hostMembers || [])

        // Load opponent club members if opponent club exists
        if (compData.opponent_club_id) {
          const oppMembers = await getClubMembers(compData.opponent_club_id)
          setOpponentMembers(oppMembers || [])
        }
      }
    } catch (err) {
      console.error('Failed to load competition details:', err)
      showToast('Error loading page details', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (competitionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId])

  // Handle Roster Invitation Form Submit
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!competition || !inviteUserId) return

    setIsSubmitting(true)
    const { participant, error } = await inviteMemberToRoster(
      competition.id,
      inviteClubId || competition.club_id,
      inviteUserId,
      invitePartnerId || null
    )

    if (!error && participant) {
      setParticipants(prev => [...prev, participant])
      showToast('Invitation sent successfully!', 'success')
      setShowInviteModal(false)
      setInviteUserId('')
      setInvitePartnerId('')
    } else {
      showToast(error?.message || 'Failed to send invite', 'error')
    }
    setIsSubmitting(false)
  }

  // Handle Match Score Recording
  const handleRecordMatch = (matchup: CompetitionMatchup) => {
    setRecordingMatchup(matchup)
    setShowScoreModal(true)
  }

  const handleSaveMatch = async (matchData: {
    sport: string
    match_type: 'singles' | 'doubles'
    participants: { user_id: string; team: number }[]
    score_sets: { set_number: number; team1_score: number; team2_score: number }[]
  }) => {
    if (!recordingMatchup || !competition) return

    setIsSubmitting(true)
    const { error } = await recordCompetitionMatch(recordingMatchup.id, {
      ...matchData,
      club_id: competition.club_id,
    })

    if (!error) {
      showToast('Match score updated!', 'success')
      setShowScoreModal(false)
      setRecordingMatchup(null)
      loadData()

      // If all matches completed, complete the competition
      const updatedMatchups = await getCompetitionMatchups(competition.id)
      const allComplete = updatedMatchups.matchups?.every(m => m.status === 'completed')
      if (allComplete) {
        await completeCompetition(competition.id)
        showToast('All matches completed! Competition finalized.', 'success')
        loadData()
      }
    } else {
      showToast('Failed to save match score', 'error')
    }
    setIsSubmitting(false)
  }

  // Calculate Standing records for Pools
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

  if (isLoading || !competition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040d0f]">
        <p className="text-slate-400">Loading competition...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#040d0f] text-white p-4">
      {/* Top action header */}
      <div className="mx-auto max-w-4xl flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <Badge variant={competition.status === 'live' ? 'live' : 'blue'}>
          {competition.status.toUpperCase()}
        </Badge>
      </div>

      {/* Main Title Banner */}
      <div className="mx-auto max-w-4xl mb-6 text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">
          {competition.title}
        </h1>
        <p className="text-xs text-[var(--arena-text-muted)] mt-1.5 uppercase tracking-wider">
          🏆 Format: {competition.format.replace(/_/g, ' ')} • Sport: {competition.sport}
        </p>
      </div>

      {/* Level 1 Navigation Tabs */}
      <div className="mx-auto max-w-4xl border-b border-white/10 flex gap-2 overflow-x-auto whitespace-nowrap mb-6">
        {([
          { id: 'details', label: 'Details' },
          { id: 'roster', label: 'Roster' },
          { id: 'matches', label: 'Matches' },
          { id: 'standings', label: 'Standings' }
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
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Tab 1: Details */}
        {activeTab === 'details' && (
          <Card className="border-white/10 bg-[#0a0f0e] shadow-[var(--arena-glow)]">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--arena-lime)] flex items-center gap-1.5 uppercase tracking-wider mb-2">
                  <Info size={16} /> Competition Details
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {competition.rules || "No custom rules set. Default Badminton World Federation (BWF) scoring applied."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Start Date</p>
                  <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    {competition.start_date ? new Date(competition.start_date).toLocaleDateString() : 'Pending schedule'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Host Club</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {competition.club?.name} ({competition.club?.city})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Roster */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight">Roster List</h2>
              {isAdmin && (
                <Button 
                  onClick={() => {
                    setInviteClubId(competition.club_id)
                    setShowInviteModal(true)
                  }}
                  className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 gap-1"
                >
                  <UserPlus size={15} />
                  Invite Player
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {participants.map(p => {
                const isUser1Pending = p.user_1_status === 'pending'
                const isUser2Pending = p.user_2_status === 'pending'
                return (
                  <Card key={p.id} className="border-white/10 bg-[#0a0f0e]">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-white text-base leading-tight">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            User 1: {isUser1Pending ? '⏳ Invited' : '✅ Active'}
                          </span>
                          {p.user_2_id && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              User 2: {isUser2Pending ? '⏳ Invited' : '✅ Active'}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={(isUser1Pending || isUser2Pending) ? 'muted' : 'blue'}>
                        {(isUser1Pending || isUser2Pending) ? 'Pending Accept' : 'Ready'}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              })}
              {participants.length === 0 && (
                <p className="text-slate-500 italic text-sm py-4">No participants registered in the rosters yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Matches */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight">Match Schedule</h2>
              {/* Pool filter */}
              {pools.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold uppercase">Pool:</span>
                  <select
                    value={selectedPoolId}
                    onChange={(e) => setSelectedPoolId(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg p-1.5 text-xs text-white cursor-pointer"
                  >
                    <option value="all">All Pools</option>
                    {pools.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {matchups
                .filter(m => selectedPoolId === 'all' || m.pool_id === selectedPoolId)
                .map((m, index) => {
                  return (
                    <Card key={m.id} className="border-white/10 bg-[#0a0f0e]">
                      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
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

                        {/* Scores set or action */}
                        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
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

                          {m.status !== 'completed' && isAdmin && (
                            <Button
                              onClick={() => handleRecordMatch(m)}
                              size="sm"
                              className="bg-slate-800 text-white border border-white/10 hover:bg-slate-700"
                            >
                              Record Score
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}

        {/* Tab 4: Standings */}
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
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 bg-slate-950/40 text-[var(--arena-text-muted)] font-black uppercase">
                              <th className="py-3 px-4">Rank</th>
                              <th className="py-3 px-4">Player / Pair</th>
                              <th className="py-3 px-4 text-center">Played</th>
                              <th className="py-3 px-4 text-center">Wins</th>
                              <th className="py-3 px-4 text-center">Losses</th>
                              <th className="py-3 px-4 text-center">Sets (W/L)</th>
                              <th className="py-3 px-4 text-center">Points (W/L)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standingList.map((st, sIdx) => (
                              <tr key={st.participantId} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="py-3 px-4 font-extrabold text-[var(--arena-lime)]">#{sIdx + 1}</td>
                                <td className="py-3 px-4 font-bold text-white">{st.name}</td>
                                <td className="py-3 px-4 text-center font-semibold">{st.played}</td>
                                <td className="py-3 px-4 text-center font-extrabold text-emerald-400">{st.wins}</td>
                                <td className="py-3 px-4 text-center font-semibold text-red-400">{st.losses}</td>
                                <td className="py-3 px-4 text-center font-mono text-slate-400">
                                  {st.setsWon} - {st.setsLost}
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-slate-400">
                                  {st.pointsWon} - {st.pointsLost}
                                </td>
                              </tr>
                            ))}
                            {standingList.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-4 text-center text-slate-500 italic">No pool standings computed yet.</td>
                              </tr>
                            )}
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
      </div>

      {/* Roster Invitation Modal Form */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border-white/10 bg-[#0a0f0e] text-white">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight">Roster Invitation</h3>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Target Club</label>
                  <select
                    value={inviteClubId || ''}
                    onChange={(e) => setInviteClubId(e.target.value || null)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white"
                  >
                    <option value={competition.club_id}>{competition.club?.name} (Host)</option>
                    {competition.opponent_club_id && (
                      <option value={competition.opponent_club_id}>{competition.opponent_club?.name} (Opponent)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Player 1</label>
                  <select
                    value={inviteUserId}
                    onChange={(e) => setInviteUserId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white"
                  >
                    <option value="">Select a player...</option>
                    {(inviteClubId === competition.opponent_club_id ? opponentMembers : clubMembers).map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Player 2 (Optional for Doubles)</label>
                  <select
                    value={invitePartnerId}
                    onChange={(e) => setInvitePartnerId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white"
                  >
                    <option value="">None (Singles)</option>
                    {(inviteClubId === competition.opponent_club_id ? opponentMembers : clubMembers)
                      .filter(m => m.user_id !== inviteUserId)
                      .map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Score Modal */}
      {showScoreModal && recordingMatchup && (
        <ScoreRecordingModal
          isOpen={showScoreModal}
          onClose={() => {
            setShowScoreModal(false)
            setRecordingMatchup(null)
          }}
          clubId={competition.club_id}
          friendlyContext={{
            matchupId: recordingMatchup.id,
            pairA: recordingMatchup.participant_a ? {
              ...recordingMatchup.participant_a,
              friendly_id: competition.id,
              pair_name: recordingMatchup.participant_a.name,
              player_1_id: recordingMatchup.participant_a.user_1_id || '',
              player_2_id: recordingMatchup.participant_a.user_2_id || null,
              order_index: 0
            } : undefined,
            pairB: recordingMatchup.participant_b ? {
              ...recordingMatchup.participant_b,
              friendly_id: competition.id,
              pair_name: recordingMatchup.participant_b.name,
              player_1_id: recordingMatchup.participant_b.user_1_id || '',
              player_2_id: recordingMatchup.participant_b.user_2_id || null,
              order_index: 0
            } : undefined
          }}
          onSave={handleSaveMatch}
        />
      )}
    </div>
  )
}
