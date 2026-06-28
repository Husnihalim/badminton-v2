import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Calendar, MapPin, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import BwfMatchupCard from '../components/competition/BwfMatchupCard'
import { supabase } from '../lib/supabase'
import {
  getCompetition,
  getCompetitionClubs,
  getCompetitionParticipants,
  getCompetitionMatchups,
  inviteMemberToRoster,
  removeParticipant,
  confirmLineup,
  generateMatchups,
  swapMatchupParticipants,
  startCompetition,
  recordCompetitionMatch,
  getLeagueStandings,
  cancelCompetition,
  respondToCompetitionInvite,
} from '../lib/api/competitions'
import { getMatchupParticipantOverlapMessage } from '../lib/competitionIntegrity'
import { getClubMembers, getMyClubs } from '../lib/api/clubs'
import type {
  Competition,
  CompetitionClub,
  CompetitionParticipant,
  CompetitionMatchup,
} from '../types/competition'
import type { Club, Membership } from '../types'
import { cn } from '../lib/utils'

type Tab = 'overview' | 'rosters' | 'matchups' | 'results'

export default function CompetitionDetailsPage() {
  const { competitionId } = useParams<{ competitionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useNotifications()

  const [competition, setCompetition] = useState<Competition | null>(null)
  const [compClubs, setCompClubs] = useState<CompetitionClub[]>([])
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  const [matchups, setMatchups] = useState<CompetitionMatchup[]>([])
  const [myClubs, setMyClubs] = useState<(Club & { role: string })[]>([])
  const [clubMembers, setClubMembers] = useState<Membership[]>([])
  const [standings, setStandings] = useState<{
    clubId: string
    clubName: string
    played: number
    won: number
    lost: number
    rubbersWon: number
    rubbersLost: number
  }[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [showScoreModal, setShowScoreModal] = useState(false)
  const [recordingMatchup, setRecordingMatchup] = useState<CompetitionMatchup | null>(null)
  const [pairDrafts, setPairDrafts] = useState<Record<string, { player1Id: string; player2Id: string }>>({})

  const myCompetitionClubs = useMemo(() => {
    if (!user || !compClubs.length) return null
    return compClubs.filter(cc => myClubs.some(mc => mc.id === cc.club_id))
  }, [user, compClubs, myClubs])

  // Prefer a confirmed club for match recording, but keep invited club context
  // so invitation acceptance can still be shown before confirmation.
  const myClub = useMemo(() => {
    if (!myCompetitionClubs?.length) return null
    return myCompetitionClubs.find(cc => cc.status === 'confirmed') || myCompetitionClubs[0]
  }, [myCompetitionClubs])

  const adminClubIds = useMemo(() => new Set(
    myClubs
      .filter(club => club.role === 'owner' || club.role === 'admin')
      .map(club => club.id)
  ), [myClubs])

  const isAdmin = !!myCompetitionClubs?.some(cc => adminClubIds.has(cc.club_id))
  const isHostAdmin = !!competition && adminClubIds.has(competition.club_id)

  const opponentParticipants = useMemo(() => {
    if (!myClub) return participants
    return participants.filter(p => p.club_id !== myClub.club_id)
  }, [myClub, participants])

  async function loadData() {
    setIsLoading(true)
    try {
      const [
        { competition: comp },
        { clubs: clubsData },
        { participants: parts },
        { matchups: matchData },
        myClubsData,
      ] = await Promise.all([
        getCompetition(competitionId!),
        getCompetitionClubs(competitionId!),
        getCompetitionParticipants(competitionId!),
        getCompetitionMatchups(competitionId!),
        getMyClubs(),
      ])

      setCompetition(comp)
      setCompClubs(clubsData)
      setParticipants(parts || [])
      setMatchups(matchData || [])
      setMyClubs(myClubsData)

      if (comp && clubsData.length > 0) {
        // Load members for all clubs in the competition
        const allMembers: Membership[] = []
        for (const cc of clubsData) {
          const members = await getClubMembers(cc.club_id)
          allMembers.push(...(members || []))
        }
        setClubMembers(allMembers)
      }

      if (comp?.status === 'completed') {
        const { standings: s } = await getLeagueStandings(competitionId!)
        setStandings(s || [])
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load competition', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (competitionId) {
      ;(async () => {
        await loadData()
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId])

  // Series progress (for friendly)
  const seriesStats = useMemo(() => {
    if (!competition || competition.format !== 'friendly') return null
    const completedMatchups = matchups.filter(m => m.status === 'completed')
    if (compClubs.length < 2) return null

    const hostClub = compClubs.find(cc => cc.club_id === competition.club_id)
    const opponentClub = compClubs.find(cc => cc.club_id !== competition.club_id)

    const clubAWins = completedMatchups.filter(m => m.winner_club_id === hostClub?.id).length
    const clubBWins = completedMatchups.filter(m => m.winner_club_id === opponentClub?.id).length

    return { clubAWins, clubBWins, total: matchups.length }
  }, [competition, matchups, compClubs])

  const handleInvitePlayer = async (clubId: string, userId: string, partnerId?: string, rank?: number) => {
    if (!competition) return
    const { participant, error } = await inviteMemberToRoster(competition.id, clubId, userId, partnerId || null, rank || null)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    if (participant) {
      setParticipants(prev => [...prev, participant])
      showToast(partnerId ? 'Pair invitation sent!' : 'Invitation sent!', 'success')
    }
  }

  const handleRemovePlayer = async (participantId: string) => {
    const { error } = await removeParticipant(participantId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setParticipants(prev => prev.filter(p => p.id !== participantId))
    showToast('Player removed', 'success')
  }

  const handleConfirmLineup = async (clubId?: string) => {
    const targetClubId = clubId || myClub?.club_id
    if (!competition || !targetClubId) return
    const { error } = await confirmLineup(competition.id, targetClubId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Lineup confirmed!', 'success')
    loadData()
  }

  const handleGenerateMatchups = async () => {
    if (!competition) return
    const { matchups: newMatchups, error } = await generateMatchups(competition.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMatchups(newMatchups || [])
    showToast('Matchups generated!', 'success')
  }

  const handleSwapPairing = async (matchupId: string, newParticipantAId: string, newParticipantBId: string) => {
    const { error } = await swapMatchupParticipants(matchupId, newParticipantAId, newParticipantBId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Pairing updated', 'success')
    loadData()
  }

  const handleStartCompetition = async () => {
    if (!competition) return
    const { error } = await startCompetition(competition.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Competition is live!', 'success')
    loadData()
  }

  const handleCancelCompetition = async () => {
    if (!competition) return
    const { error } = await cancelCompetition(competition.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Competition cancelled', 'info')
    loadData()
  }

  const myInvitedClub = useMemo(() => {
    if (!user || !compClubs.length || !myClubs.length) return null
    return compClubs.find(cc =>
      cc.status === 'invited' &&
      myClubs.some(mc => mc.id === cc.club_id)
    ) || null
  }, [user, compClubs, myClubs])

  const handleAcceptInvite = async (clubToAccept: CompetitionClub | null = myInvitedClub) => {
    if (!competition || !clubToAccept) return
    const { error } = await respondToCompetitionInvite(competition.invite_code, clubToAccept.club_id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Invitation accepted!', 'success')
    setActiveTab('rosters')
    loadData()
  }

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
    const recordingClubId = myClub?.club_id || competition.club_id
    const { error } = await recordCompetitionMatch(recordingMatchup.id, {
      ...matchData,
      club_id: recordingClubId,
    })
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Match recorded!', 'success')
    setShowScoreModal(false)
    setRecordingMatchup(null)
    loadData()
  }

  // Standing computation for active competitions
  const computedStandings = useMemo(() => {
    if (!matchups.length || !participants.length) return []

    if (standings.length) return standings // Use cached if competition is completed

    const clubResults: Record<string, { played: number; won: number; lost: number; rubbersWon: number; rubbersLost: number }> = {}
    const completed = matchups.filter(m => m.status === 'completed')

    for (const m of completed) {
      const a = participants.find(p => p.id === m.participant_a_id)
      const b = participants.find(p => p.id === m.participant_b_id)
      if (!a || !b) continue

      if (!clubResults[a.club_id!]) clubResults[a.club_id!] = { played: 0, won: 0, lost: 0, rubbersWon: 0, rubbersLost: 0 }
      if (!clubResults[b.club_id!]) clubResults[b.club_id!] = { played: 0, won: 0, lost: 0, rubbersWon: 0, rubbersLost: 0 }

      // Count rubber-level wins for standings
      if (m.winner_participant_id === m.participant_a_id) {
        clubResults[a.club_id!].rubbersWon++
        clubResults[b.club_id!].rubbersLost++
      } else {
        clubResults[b.club_id!].rubbersWon++
        clubResults[a.club_id!].rubbersLost++
      }
    }

    // Calculate tie-level wins (a club wins a tie if they win more rubbers than the other)
    if (competition?.format === 'league') {
      const tieResults: Record<string, number> = {}
      for (const m of completed) {
        const a = participants.find(p => p.id === m.participant_a_id)
        const b = participants.find(p => p.id === m.participant_b_id)
        if (!a || !b) continue

        const key = [a.club_id, b.club_id].sort().join('-')
        if (tieResults[key] !== undefined) continue // Already processed this tie

        // Get all matchups between these two clubs
        const tieMatchups = completed.filter(mm => {
          const aa = participants.find(p => p.id === mm.participant_a_id)
          const bb = participants.find(p => p.id === mm.participant_b_id)
          return aa && bb && ((aa.club_id === a.club_id && bb.club_id === b.club_id) || (aa.club_id === b.club_id && bb.club_id === a.club_id))
        })

        const clubARubbersWon = tieMatchups.filter(mm => {
          const aa = participants.find(p => p.id === mm.participant_a_id)
          return aa && aa.club_id === a.club_id && mm.winner_participant_id === mm.participant_a_id
        }).length + tieMatchups.filter(mm => {
          const bb = participants.find(p => p.id === mm.participant_b_id)
          return bb && bb.club_id === a.club_id && mm.winner_participant_id === mm.participant_b_id
        }).length

        const clubBRubbersWon = tieMatchups.filter(mm => {
          const aa = participants.find(p => p.id === mm.participant_a_id)
          return aa && aa.club_id === b.club_id && mm.winner_participant_id === mm.participant_a_id
        }).length + tieMatchups.filter(mm => {
          const bb = participants.find(p => p.id === mm.participant_b_id)
          return bb && bb.club_id === b.club_id && mm.winner_participant_id === mm.participant_b_id
        }).length

        if (clubARubbersWon > clubBRubbersWon) {
          clubResults[a.club_id!].won++
          clubResults[b.club_id!].lost++
        } else if (clubBRubbersWon > clubARubbersWon) {
          clubResults[b.club_id!].won++
          clubResults[a.club_id!].lost++
        }

        tieResults[key] = 1
      }
    } else {
      // Friendly: count rubber wins
      for (const m of completed) {
        const a = participants.find(p => p.id === m.participant_a_id)
        const b = participants.find(p => p.id === m.participant_b_id)
        if (!a || !b) continue
        clubResults[a.club_id!].played++
        clubResults[b.club_id!].played++
      }
    }

    return Object.entries(clubResults).map(([clubId, r]) => {
      const cc = compClubs.find(c => c.club_id === clubId)
      return {
        clubId,
        clubName: cc?.club?.name || 'Unknown',
        played: r.played,
        won: r.won,
        lost: r.lost,
        rubbersWon: r.rubbersWon,
        rubbersLost: r.rubbersLost,
      }
    }).sort((a, b) => b.won - a.won || (b.rubbersWon - b.rubbersLost) - (a.rubbersWon - a.rubbersLost))
  }, [matchups, participants, compClubs, standings, competition])

  // Map participant id -> club_id
  const participantClubMap = useMemo(() => {
    const map: Record<string, string> = {}
    participants.forEach(p => { if (p.club_id) map[p.id] = p.club_id })
    return map
  }, [participants])

  // Map club_id -> club name
  const clubNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    compClubs.forEach(cc => { if (cc.club?.name) map[cc.club_id] = cc.club.name })
    return map
  }, [compClubs])

  // Map competition_clubs.id -> club_id
  const compClubToClubId = useMemo(() => {
    const map: Record<string, string> = {}
    compClubs.forEach(cc => { map[cc.id] = cc.club_id })
    return map
  }, [compClubs])

  // Group matchups by tie (club A vs club B)
  const tieGroups = useMemo(() => {
    const groups: { clubAId: string; clubBId: string; clubAName: string; clubBName: string; matchups: CompetitionMatchup[] }[] = []
    const seen = new Set<string>()

    for (const m of matchups) {
      const cA = m.club_a_id ? compClubToClubId[m.club_a_id] : participantClubMap[m.participant_a_id]
      const cB = m.club_b_id ? compClubToClubId[m.club_b_id] : participantClubMap[m.participant_b_id]
      if (!cA || !cB) continue

      const key = [cA, cB].sort().join('-')
      if (!seen.has(key)) {
        seen.add(key)
        groups.push({
          clubAId: cA,
          clubBId: cB,
          clubAName: clubNameMap[cA] || 'Club A',
          clubBName: clubNameMap[cB] || 'Club B',
          matchups: [],
        })
      }
      groups.find(g => [g.clubAId, g.clubBId].sort().join('-') === key)?.matchups.push(m)
    }

    return groups
  }, [matchups, participantClubMap, clubNameMap, compClubToClubId])

  if (isLoading || !competition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--arena-bg)]">
        <p className="text-slate-400">Loading competition...</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'rosters', label: 'Rosters' },
    { id: 'matchups', label: 'Matches' },
    { id: 'results', label: 'Results' },
  ]

  return (
    <div className="min-h-screen bg-[var(--arena-bg)] p-3 sm:p-4">

      {/* Header */}
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant={
            competition.status === 'live' ? 'live' :
            competition.status === 'completed' ? 'blue' :
            competition.status === 'cancelled' ? 'muted' : 'blue'
          }>
            {competition.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <div className="mx-auto mb-4 max-w-4xl">
        <h1 className="text-xl font-black uppercase text-white sm:text-2xl">{competition.title}</h1>
        <p className="mt-1 text-xs text-slate-500">
          {competition.format === 'friendly' ? '🤝 Friendly' : '🏆 League'} • {competition.pairs_count} pairs • {competition.sets_count === 1 ? '1 set' : 'Best of 3'} • {competition.points_per_set} pts
        </p>
      </div>

      {/* Series bar for friendly */}
      {seriesStats && (
        <div className="mx-auto mb-4 max-w-4xl">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
            <span className="text-xs font-bold uppercase text-slate-500">Series</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="bg-[var(--arena-lime)] h-full transition-all" style={{ width: `${seriesStats.total > 0 ? (seriesStats.clubAWins / seriesStats.total) * 100 : 50}%` }} />
              <div className="bg-slate-600 h-full transition-all" style={{ width: `${seriesStats.total > 0 ? (seriesStats.clubBWins / seriesStats.total) * 100 : 50}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
              <span className="text-[var(--arena-lime)]">{compClubs[0]?.club?.name || 'Home'} {seriesStats.clubAWins}</span>
              {' '}—{' '}{seriesStats.clubBWins} {compClubs[1]?.club?.name || 'Away'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-4xl mb-6 flex gap-2 overflow-x-auto border-b border-white/10 whitespace-nowrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
              activeTab === tab.id ? 'border-[var(--arena-lime)] text-[var(--arena-lime)]' : 'border-transparent text-slate-500 hover:text-white'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl space-y-6">

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <Card className="border-white/10 bg-[var(--arena-surface)]">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[var(--arena-lime)]" />
                <h3 className="text-sm font-bold text-white uppercase">Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-bold text-white flex items-center gap-1">
                    <Calendar size={14} /> {competition.start_date ? new Date(competition.start_date).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Venue</p>
                  <p className="font-bold text-white flex items-center gap-1">
                    <MapPin size={14} /> {competition.location || 'TBD'}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="mb-2 text-xs font-bold text-slate-500 uppercase">Participating Clubs</p>
                <div className="space-y-2">
                  {compClubs.filter(cc => cc.status !== 'declined').map(cc => {
                    const isMyInvitedClub = cc.status === 'invited' && myClubs.some(mc => mc.id === cc.club_id)
                    const canManageThisClub = adminClubIds.has(cc.club_id)
                    return (
                      <div key={cc.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm">🏸</div>
                          <div>
                            <p className="font-bold text-white">{cc.club?.name || 'Unknown Club'}</p>
                            <p className="text-xs text-slate-500">{cc.lineup_confirmed ? '✅ Lineup confirmed' : '⏳ Setting lineup'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cc.status === 'invited' && <Badge variant="muted">invited</Badge>}
                          {cc.status === 'confirmed' && <Badge variant="blue">confirmed</Badge>}
                          {isMyInvitedClub && canManageThisClub && (
                            <Button onClick={() => handleAcceptInvite(cc)} size="sm" className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 text-xs h-7 px-3">
                              Accept
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {competition.rules && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-500">Rules</p>
                  <p className="text-sm text-slate-300 mt-1">{competition.rules}</p>
                </div>
              )}

              {isHostAdmin && ['draft', 'registration'].includes(competition.status) && (
                <div className="border-t border-white/10 pt-4">
                  <Button variant="ghost" onClick={handleCancelCompetition} className="text-red-400 hover:text-red-300 text-xs">
                    Cancel Competition
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: ROSTERS */}
        {activeTab === 'rosters' && (
          <div className="space-y-6">
            {compClubs.filter(cc => cc.status !== 'declined').map(cc => {
              const clubParts = participants.filter(p => p.club_id === cc.club_id).sort((a, b) => (a.rank || 99) - (b.rank || 99))
              const canManageThisClub = adminClubIds.has(cc.club_id)
              const isInvited = cc.status === 'invited'
              const isConfirmed = cc.lineup_confirmed
              const clubMemberList = clubMembers.filter(m => m.club_id === cc.club_id)
              const availableMembers = clubMemberList.filter(m => !clubParts.some(p => p.user_1_id === m.user_id || p.user_2_id === m.user_id))

              return (
                <div key={cc.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">{cc.club?.name || 'Club'}</h3>
                      <p className="text-xs text-slate-500">{clubParts.length} / {competition.pairs_count} pairs</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!isInvited && canManageThisClub && !isConfirmed && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/club/${cc.club_id}?tab=noticeboard`)}
                          className="h-8 px-3 text-xs"
                        >
                          Announce
                        </Button>
                      )}
                      {isInvited && canManageThisClub ? (
                        <Button onClick={() => handleAcceptInvite(cc)} size="sm" className="h-8 bg-[var(--arena-lime)] px-3 text-xs text-black hover:bg-[var(--arena-lime)]/90">
                          Accept invite
                        </Button>
                      ) : isInvited ? (
                        <Badge variant="muted">Invited</Badge>
                      ) : isConfirmed ? (
                        <Badge variant="live">✅ Confirmed</Badge>
                      ) : canManageThisClub ? (
                        <Badge variant="blue">Your lineup</Badge>
                      ) : (
                        <Badge variant="muted">Waiting...</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: competition.pairs_count || 5 }).map((_, idx) => {
                      const rank = idx + 1
                      const part = clubParts.find(p => p.rank === rank)
                      const draftKey = `${cc.club_id}-${rank}`
                      const draft = pairDrafts[draftKey] || { player1Id: '', player2Id: '' }
                      const player1Options = availableMembers.filter(member => member.user_id !== draft.player2Id)
                      const player2Options = availableMembers.filter(member => member.user_id !== draft.player1Id)
                      return (
                        <div key={idx} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                            {rank}
                          </div>
                          {isInvited ? (
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 italic">
                                Waiting for this club to accept the competition invite.
                              </p>
                            </div>
                          ) : part ? (
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-sm">{part.name}</p>
                              <p className="text-xs text-slate-500">
                                {part.player_1?.name || 'Player 1'}
                                {part.player_2 ? ` + ${part.player_2.name}` : ''}
                              </p>
                            </div>
	                          ) : (
	                            <div className="flex-1">
	                              {canManageThisClub && !isConfirmed ? (
	                                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
	                                  <select
	                                    value={draft.player1Id}
	                                    onChange={(e) => {
	                                      const player1Id = e.target.value
	                                      setPairDrafts(prev => ({
	                                        ...prev,
	                                        [draftKey]: {
	                                          player1Id,
	                                          player2Id: prev[draftKey]?.player2Id === player1Id ? '' : prev[draftKey]?.player2Id || '',
	                                        },
	                                      }))
	                                    }}
	                                    className="flex-1 min-w-[120px] rounded border border-white/10 bg-slate-900 p-1.5 text-xs text-white"
	                                  >
	                                    <option value="">Player 1...</option>
	                                    {player1Options.map(m => (
	                                      <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
	                                    ))}
	                                  </select>
                                    <select
                                      value={draft.player2Id}
                                      onChange={(e) => {
                                        const player2Id = e.target.value
                                        setPairDrafts(prev => ({
                                          ...prev,
                                          [draftKey]: {
                                            player1Id: prev[draftKey]?.player1Id === player2Id ? '' : prev[draftKey]?.player1Id || '',
                                            player2Id,
                                          },
                                        }))
                                      }}
                                      className="flex-1 min-w-[120px] rounded border border-white/10 bg-slate-900 p-1.5 text-xs text-white"
                                    >
                                      <option value="">Player 2...</option>
                                      {player2Options.map(m => (
                                        <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                                      ))}
                                    </select>
                                    <Button
                                      type="button"
                                      disabled={!draft.player1Id || !draft.player2Id}
                                      onClick={async () => {
                                        await handleInvitePlayer(cc.club_id, draft.player1Id, draft.player2Id, rank)
                                        setPairDrafts(prev => ({
                                          ...prev,
                                          [draftKey]: { player1Id: '', player2Id: '' },
                                        }))
                                      }}
                                      className="h-8 bg-[var(--arena-lime)] px-3 text-xs text-black hover:bg-[var(--arena-lime)]/90 disabled:opacity-50"
                                    >
                                      Add pair
                                    </Button>
	                                </div>
	                              ) : (
	                                <p className="text-xs text-slate-600 italic">Waiting for pair</p>
                              )}
                            </div>
                          )}
                          {part && canManageThisClub && !isConfirmed && (
                            <button onClick={() => handleRemovePlayer(part.id)} className="text-xs text-red-400 hover:text-red-300">
                              Remove
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {canManageThisClub && !isInvited && !isConfirmed && clubParts.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-slate-500">Drag to reorder by rank (strongest first)</p>
                      <div className="space-y-1 mb-3">
                        {clubParts.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((p, i) => (
                          <div key={p.id} className="flex items-center gap-2 text-sm text-white">
                            <span className="text-slate-500 w-6">{i + 1}.</span>
                            <span className="flex-1">{p.name}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  const newRank = (p.rank || i + 1) - 1
                                  if (newRank < 1) return
                                  const swapWith = clubParts.find(pp => pp.rank === newRank)
                                  if (swapWith) {
                                    await supabase.from('competition_participants').update({ rank: p.rank }).eq('id', swapWith.id)
                                    await supabase.from('competition_participants').update({ rank: newRank }).eq('id', p.id)
                                    loadData()
                                  }
                                }}
                                className="text-slate-500 hover:text-white px-1"
                                disabled={i === 0}
                              >↑</button>
                              <button
                                onClick={async () => {
                                  const newRank = (p.rank || i + 1) + 1
                                  const swapWith = clubParts.find(pp => pp.rank === newRank)
                                  if (swapWith) {
                                    await supabase.from('competition_participants').update({ rank: p.rank }).eq('id', swapWith.id)
                                    await supabase.from('competition_participants').update({ rank: newRank }).eq('id', p.id)
                                    loadData()
                                  }
                                }}
                                className="text-slate-500 hover:text-white px-1"
                                disabled={i === clubParts.length - 1}
                              >↓</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => handleConfirmLineup(cc.club_id)} className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 text-xs">
                        Confirm Lineup
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: MATCHUPS (combined matchups + live) */}
        {activeTab === 'matchups' && (
          <div className="space-y-4">
            {matchups.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">No matchups yet. All clubs must confirm their lineups first.</p>
                {isHostAdmin && competition.status === 'matchmaking' && (
                  <Button onClick={handleGenerateMatchups} className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90">
                    Generate Matchups
                  </Button>
                )}
              </div>
            )}

            {matchups.length > 0 && !matchups[0]?.locked && isHostAdmin && (
              <div className="flex justify-end">
                <Button onClick={handleStartCompetition} className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90">
                  Start Competition
                </Button>
              </div>
            )}

            {tieGroups.map(group => {
              const clubARubbers = group.matchups.filter(m => {
                const cId = participantClubMap[m.participant_a_id]
                return cId === group.clubAId && m.status === 'completed'
              }).length + group.matchups.filter(m => {
                const cId = participantClubMap[m.participant_b_id]
                return cId === group.clubAId && m.status === 'completed'
              }).length
              const clubBRubbers = group.matchups.filter(m => {
                const cId = participantClubMap[m.participant_b_id]
                return cId === group.clubBId && m.status === 'completed'
              }).length + group.matchups.filter(m => {
                const cId = participantClubMap[m.participant_a_id]
                return cId === group.clubBId && m.status === 'completed'
              }).length

              return (
                <div key={`${group.clubAId}-${group.clubBId}`} className="rounded-lg border border-white/10 bg-[var(--arena-surface)] overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-950/40 px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span className="text-white">{group.clubAName}</span>
                      <span className="text-slate-500">vs</span>
                      <span className="text-white">{group.clubBName}</span>
                    </div>
                    {clubARubbers + clubBRubbers > 0 && (
                      <span className="text-xs text-slate-400">
                        {group.clubAName} {clubARubbers} — {clubBRubbers} {group.clubBName}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-white/5">
                    {group.matchups.map(m => {
                      const isAEditable = !m.locked && isAdmin && compClubs.some(cc => cc.club_id === myClub?.club_id)
                      const aClubId = participantClubMap[m.participant_a_id]
                      const bClubId = participantClubMap[m.participant_b_id]
                      const myClubId = myClub?.club_id
                      const myClubParticipants = participants.filter(p => p.club_id === myClubId)
                      const matchupWarning = getMatchupParticipantOverlapMessage(m.participant_a, m.participant_b)

                      return (
                        <div key={m.id} className="p-4">
                          {/* Admin editable mode (before lock) */}
                          {isAEditable && !m.locked ? (
                            <div>
                              <div className="flex items-center gap-4">
                                <div className="flex-1 text-right">
                                  <p className="text-xs text-slate-500">{clubNameMap[aClubId] || ''}</p>
                                  <p className="font-bold text-white">{m.participant_a?.name || 'TBD'}</p>
                                  <select
                                    value={m.participant_a_id}
                                    onChange={async (e) => {
                                      if (!e.target.value) return
                                      const otherParticipants = participants.filter(p => p.club_id !== myClubId)
                                      const defaultOther = otherParticipants.find(p => p.rank === m.participant_b?.rank) || otherParticipants[0]
                                      if (defaultOther) {
                                        await handleSwapPairing(m.id, e.target.value, defaultOther.id)
                                      }
                                    }}
                                    className="mt-1 text-xs rounded border border-white/10 bg-slate-900 p-1 text-white max-w-[160px]"
                                    disabled={m.locked || m.status === 'completed'}
                                  >
                                    {myClubParticipants.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <span className="text-slate-500 text-xs font-bold shrink-0">VS</span>
                                <div className="flex-1">
                                  <p className="text-xs text-slate-500">{clubNameMap[bClubId] || ''}</p>
                                  <p className="font-bold text-white">{m.participant_b?.name || 'TBD'}</p>
                                  <select
                                    value={m.participant_b_id}
                                    onChange={async (e) => {
                                      if (!e.target.value) return
                                      await handleSwapPairing(m.id, m.participant_a_id, e.target.value)
                                    }}
                                    className="mt-1 text-xs rounded border border-white/10 bg-slate-900 p-1 text-white max-w-[160px]"
                                    disabled={m.locked || m.status === 'completed'}
                                  >
                                    {opponentParticipants.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {m.match?.score_sets && m.match.score_sets.length > 0 && (
                                <p className="mt-2 text-xs text-slate-500 text-center">
                                  {m.match.score_sets.map(s => `${s.team1_score}-${s.team2_score}`).join(', ')}
                                </p>
                              )}
                              {matchupWarning && (
                                <p className="mt-3 rounded border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200">{matchupWarning}</p>
                              )}
                            </div>
                          ) : (
                            /* BwfMatchupCard for locked/live/completed */
                            <div className="space-y-2">
                              <BwfMatchupCard
                                matchup={{
                                  ...m,
                                  participant_a: m.participant_a ? { ...m.participant_a, name: `[${clubNameMap[aClubId] || '?'}] ${m.participant_a.name}` } : undefined,
                                  participant_b: m.participant_b ? { ...m.participant_b, name: `[${clubNameMap[bClubId] || '?'}] ${m.participant_b.name}` } : undefined,
                                }}
                                isAdmin={isAdmin && competition.status === 'live' && !matchupWarning}
                                onRecordScore={isAdmin && competition.status === 'live' && !matchupWarning ? () => handleRecordMatch(m) : undefined}
                              />
                              {matchupWarning && (
                                <p className="rounded border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200">{matchupWarning}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: RESULTS */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {competition.status === 'completed' && (
              <Card className="border-green-800 bg-green-900/20 text-center">
                <CardContent className="p-6">
                  <Sparkles size={32} className="mx-auto mb-2 text-green-400" />
                  <h2 className="text-xl font-black text-white uppercase">Competition Complete</h2>
                  {competition.winning_club_id && (
                    <p className="mt-2 text-lg text-green-400">
                      🏆 {compClubs.find(cc => cc.club_id === competition.winning_club_id)?.club?.name || 'Winner'} Wins!
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {computedStandings.length > 0 && (
              <Card className="border-white/10 bg-[var(--arena-surface)]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-slate-950/40 text-slate-500 font-bold uppercase">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Club</th>
                          {competition.format === 'league' && <>
                            <th className="py-3 px-4 text-center">Won</th>
                            <th className="py-3 px-4 text-center">Lost</th>
                          </>}
                          <th className="py-3 px-4 text-center">Rubbers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {computedStandings.map((s, i) => (
                          <tr key={s.clubId} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-bold text-[var(--arena-lime)]">#{i + 1}</td>
                            <td className="py-3 px-4 font-bold text-white">{s.clubName}</td>
                            {competition.format === 'league' && <>
                              <td className="py-3 px-4 text-center text-emerald-400 font-bold">{s.won}</td>
                              <td className="py-3 px-4 text-center text-red-400 font-bold">{s.lost}</td>
                            </>}
                            <td className="py-3 px-4 text-center font-mono text-slate-400">
                              {s.rubbersWon} — {s.rubbersLost}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-tie rubber breakdown */}
            {matchups.some(m => m.status === 'completed') && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Tie Results</h3>
                {tieGroups.map(group => {
                  const completed = group.matchups.filter(m => m.status === 'completed')
                  if (completed.length === 0) return null

                  const clubARubbersWon = completed.filter(m => {
                    const aId = participantClubMap[m.participant_a_id]
                    return aId === group.clubAId && m.winner_participant_id === m.participant_a_id
                  }).length + completed.filter(m => {
                    const bId = participantClubMap[m.participant_b_id]
                    return bId === group.clubAId && m.winner_participant_id === m.participant_b_id
                  }).length
                  const clubBRubbersWon = completed.length - clubARubbersWon
                  const tieWinner = clubARubbersWon > clubBRubbersWon ? group.clubAName : clubBRubbersWon > clubARubbersWon ? group.clubBName : null

                  return (
                    <Card key={`${group.clubAId}-${group.clubBId}-result`} className="border-white/10 bg-[var(--arena-surface)] overflow-hidden">
                      <div className={cn(
                        "flex items-center justify-between px-4 py-3 border-b border-white/10",
                        tieWinner ? "bg-emerald-900/10" : "bg-slate-950/30"
                      )}>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-white">{group.clubAName}</span>
                          <span className="text-slate-500 text-xs">vs</span>
                          <span className="text-white">{group.clubBName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            {group.clubAName} {clubARubbersWon} — {clubBRubbersWon} {group.clubBName}
                          </span>
                          {tieWinner && (
                            <Badge variant="live">{tieWinner} won</Badge>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-white/5">
                        {completed.map(m => {
                          const aClubId = participantClubMap[m.participant_a_id]
                          const bClubId = participantClubMap[m.participant_b_id]
                          const aWon = m.winner_participant_id === m.participant_a_id
                          const scoreText = m.match?.score_sets
                            ? m.match.score_sets.map(s => `${s.team1_score}-${s.team2_score}`).join(', ')
                            : ''

                          return (
                            <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                              <div className={cn("flex-1 text-right", aWon && "text-[var(--arena-lime)]")}>
                                <p className={cn("text-xs", aClubId ? "text-slate-500" : "text-slate-500")}>
                                  {clubNameMap[aClubId] || ''}
                                </p>
                                <p className={cn("font-bold", aWon ? "text-[var(--arena-lime)]" : "text-white")}>
                                  {m.participant_a?.name || '?'}
                                  {aWon && <span className="ml-1">✓</span>}
                                </p>
                              </div>
                              <div className="text-center shrink-0">
                                <p className="text-xs font-mono text-slate-400">{scoreText}</p>
                              </div>
                              <div className={cn("flex-1", !aWon && "text-[var(--arena-lime)]")}>
                                <p className="text-xs text-slate-500">{clubNameMap[bClubId] || ''}</p>
                                <p className={cn("font-bold", !aWon ? "text-[var(--arena-lime)]" : "text-white")}>
                                  {!aWon && <span className="mr-1">✓</span>}
                                  {m.participant_b?.name || '?'}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {matchups.filter(m => m.status === 'completed').length === 0 && competition.status !== 'completed' && (
              <p className="text-slate-500 italic">Results will appear once matches are completed.</p>
            )}
          </div>
        )}

      </div>

      {/* Score Modal */}
      {showScoreModal && recordingMatchup && (
        <ScoreRecordingModal
          isOpen={showScoreModal}
          onClose={() => { setShowScoreModal(false); setRecordingMatchup(null) }}
          clubId={competition.club_id}
          friendlyContext={{
            matchupId: recordingMatchup.id,
            pairA: recordingMatchup.participant_a ? {
              ...recordingMatchup.participant_a,
              friendly_id: competition.id,
              pair_name: recordingMatchup.participant_a.name,
              player_1_id: recordingMatchup.participant_a.user_1_id || '',
              player_2_id: recordingMatchup.participant_a.user_2_id || null,
              order_index: 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any : undefined,
            pairB: recordingMatchup.participant_b ? {
              ...recordingMatchup.participant_b,
              friendly_id: competition.id,
              pair_name: recordingMatchup.participant_b.name,
              player_1_id: recordingMatchup.participant_b.user_1_id || '',
              player_2_id: recordingMatchup.participant_b.user_2_id || null,
              order_index: 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any : undefined,
          }}
          onSave={handleSaveMatch}
        />
      )}
    </div>
  )
}
