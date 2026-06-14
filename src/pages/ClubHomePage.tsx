import { useEffect, useState, useMemo } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  ClipboardPenLine,
  UserPlus,
  X,
  Home,
  Activity,
  Trophy,
  Users,
  Megaphone,
  Share2,
} from 'lucide-react'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import ScorecardShareModal from '../components/ScorecardShareModal'
import CelebrationConfetti from '../components/CelebrationConfetti'
import { useAuth } from '../context/AuthContext'
import { useClub, useMyMembership, useClubMembers, useAllClubMatches, useClubEvents } from '../features/clubs/hooks/useClubQueries'
import { getClubJoinRequests, approveJoinRequest, rejectJoinRequest, buildInviteUrl } from '../lib/api'
import type { ClubEvent, JoinRequest, MatchWithDetails } from '../types'
import { generateStoryMoments } from '../lib/storyMoments'
import type { StoryMoment } from '../lib/storyMoments'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page } from '../components/ui/page'
import { ClubHeader } from '../features/clubs/components/ClubHeader'
import { ClubNoticeboard } from '../features/clubs/components/ClubNoticeboard'
import { ClubEventsCalendar } from '../features/clubs/components/ClubEventsCalendar'
import { ClubLeaderboard } from '../features/clubs/components/ClubLeaderboard'
import { ClubScoresFeed } from '../features/clubs/components/ClubScoresFeed'
import { ClubMembersSidebar } from '../features/clubs/components/ClubMembersSidebar'
import { ClubMembersRoster } from '../features/clubs/components/ClubMembersRoster'
import { SessionHighlightsWidget } from '../features/clubs/components/SessionHighlightsWidget'

function calculateSessionHighlights(eventMatches: MatchWithDetails[]) {
  const playerStats = new Map<string, {
    games: number
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
    matchResults: boolean[]
  }>()

  const chronMatches = [...eventMatches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  for (const match of chronMatches) {
    const scoreSets = match.score_sets || []
    if (scoreSets.length === 0) continue

    const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
    if (team1Sets === team2Sets) continue // Draw

    const winningTeam = team1Sets > team2Sets ? 1 : 2

    let team1Points = 0
    let team2Points = 0
    for (const set of scoreSets) {
      team1Points += set.team1_score
      team2Points += set.team2_score
    }

    for (const p of match.participants) {
      const name = p.name || p.guest_name || 'Guest'
      const isWin = p.team === winningTeam

      let stats = playerStats.get(name)
      if (!stats) {
        stats = { games: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, matchResults: [] }
        playerStats.set(name, stats)
      }

      stats.games++
      if (isWin) stats.wins++
      else stats.losses++

      if (p.team === 1) {
        stats.pointsFor += team1Points
        stats.pointsAgainst += team2Points
      } else {
        stats.pointsFor += team2Points
        stats.pointsAgainst += team1Points
      }
      stats.matchResults.push(isWin)
    }
  }

  const playersList = Array.from(playerStats.entries()).map(([name, stats]) => {
    const winRate = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0
    const pointDiff = stats.pointsFor - stats.pointsAgainst
    
    let longestStreak = 0
    let currentStreak = 0
    for (const res of stats.matchResults) {
      if (res) {
        currentStreak++
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak
        }
      } else {
        currentStreak = 0
      }
    }

    return {
      name,
      ...stats,
      winRate,
      pointDiff,
      longestStreak,
    }
  })

  const mvpCandidates = playersList.filter(p => p.games >= 2)
  let mvp = null
  if (mvpCandidates.length > 0) {
    mvp = [...mvpCandidates].sort((a, b) => b.winRate - a.winRate || b.pointDiff - a.pointDiff)[0]
  } else if (playersList.length > 0) {
    mvp = [...playersList].sort((a, b) => b.winRate - a.winRate || b.pointDiff - a.pointDiff)[0]
  }

  const streakCandidates = playersList.filter(p => p.longestStreak >= 2)
  let streakStar = null
  if (streakCandidates.length > 0) {
    streakStar = [...streakCandidates].sort((a, b) => b.longestStreak - a.longestStreak || b.wins - a.wins)[0]
  }

  const resilienceCandidates = playersList.filter(p => p.games >= 2)
  let resilience = null
  if (resilienceCandidates.length > 0) {
    resilience = [...resilienceCandidates].sort((a, b) => a.winRate - b.winRate || b.games - a.games)[0]
    if (resilience.winRate >= 50) {
      resilience = null
    }
  }

  const duos = new Map<string, { wins: number; matches: number }>()
  for (const match of chronMatches) {
    if (match.match_type !== 'doubles') continue
    const scoreSets = match.score_sets || []
    if (scoreSets.length === 0) continue

    const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
    if (team1Sets === team2Sets) continue // Draw

    const winningTeam = team1Sets > team2Sets ? 1 : 2

    const team1P = match.participants.filter(p => p.team === 1).map(p => p.name || p.guest_name || 'Guest')
    const team2P = match.participants.filter(p => p.team === 2).map(p => p.name || p.guest_name || 'Guest')

    if (team1P.length === 2) {
      team1P.sort()
      const key = team1P.join(' & ')
      const stats = duos.get(key) ?? { wins: 0, matches: 0 }
      stats.matches++
      if (winningTeam === 1) stats.wins++
      duos.set(key, stats)
    }
    if (team2P.length === 2) {
      team2P.sort()
      const key = team2P.join(' & ')
      const stats = duos.get(key) ?? { wins: 0, matches: 0 }
      stats.matches++
      if (winningTeam === 2) stats.wins++
      duos.set(key, stats)
    }
  }

  const duoList = Array.from(duos.entries()).map(([names, stats]) => {
    const winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0
    return { names, ...stats, winRate }
  })

  const powerDuoCandidates = duoList.filter(d => d.matches >= 2)
  let powerDuo = null
  if (powerDuoCandidates.length > 0) {
    powerDuo = [...powerDuoCandidates].sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0]
  }

  return {
    playersList,
    mvp,
    streakStar,
    resilience,
    powerDuo,
  }
}

export default function ClubHomePage() {
  const { clubId } = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: club, isLoading: clubLoading } = useClub(clubId)
  const { data: myMembership, isLoading: membershipLoading } = useMyMembership(clubId, !!user)
  const { data: members = [] } = useClubMembers(clubId)
  const { data: matches = [] } = useAllClubMatches(clubId)
  const { data: events = [] } = useClubEvents(clubId)

  // Latest Completed Session Highlights
  const latestSessionInfo = useMemo(() => {
    if (matches.length === 0) return null

    // 1. Try to find the latest event that has recorded matches
    let latestEvent: typeof events[number] | null = null
    for (const event of events) {
      const eventMatches = matches.filter(m => m.event_id === event.id)
      if (eventMatches.length > 0) {
        if (!latestEvent || (event.event_date || '').localeCompare(latestEvent.event_date || '') > 0) {
          latestEvent = event
        }
      }
    }

    if (latestEvent) {
      return {
        title: latestEvent.title,
        date: latestEvent.event_date,
        matches: matches.filter(m => m.event_id === latestEvent!.id),
      }
    }

    // 2. Fallback: Group matches by date and find the latest date
    const matchesByDate: Record<string, typeof matches> = {}
    matches.forEach(m => {
      const dStr = m.match_date || (m.created_at || '').split('T')[0] || ''
      if (dStr) {
        if (!matchesByDate[dStr]) matchesByDate[dStr] = []
        matchesByDate[dStr].push(m)
      }
    })

    let latestDate = ''
    Object.keys(matchesByDate).forEach(dStr => {
      if (!latestDate || dStr.localeCompare(latestDate) > 0) {
        latestDate = dStr
      }
    })

    if (latestDate) {
      return {
        title: `Weekly Session`,
        date: latestDate,
        matches: matchesByDate[latestDate],
      }
    }

    return null
  }, [events, matches])

  const latestHighlights = useMemo(() => {
    if (!latestSessionInfo) return null
    return calculateSessionHighlights(latestSessionInfo.matches)
  }, [latestSessionInfo])

  const [pinnedStoryIds, setPinnedStoryIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`pinned_stories_${clubId}`) || '[]')
    } catch {
      return []
    }
  })
  const [showStorySelectorModal, setShowStorySelectorModal] = useState(false)

  const handleTogglePinStory = (storyId: string) => {
    const next = pinnedStoryIds.includes(storyId)
      ? pinnedStoryIds.filter(id => id !== storyId)
      : [...pinnedStoryIds, storyId]
    setPinnedStoryIds(next)
    localStorage.setItem(`pinned_stories_${clubId}`, JSON.stringify(next))
    setSuccessMessage(pinnedStoryIds.includes(storyId) ? 'Removed from featured stories.' : 'Pinned to homepage.')
    setTimeout(() => setSuccessMessage(''), 2500)
  }

  // All computed stories for members in the club
  const allClubStories = useMemo(() => {
    const allStories: (StoryMoment & { playerName: string })[] = []
    const usedTemplates = new Set<string>()
    
    members.forEach(member => {
      if (!member.user_id) return
      const memberMatches = matches.filter(m => 
        m.participants.some(p => p.user_id === member.user_id)
      )
      if (memberMatches.length === 0) return
      
      const moments = generateStoryMoments({
        user: {
          id: member.user_id,
          name: member.name || 'Member',
          display_name: member.name || 'Member',
        },
        matches: memberMatches,
        limit: 3,
        excludeTemplates: usedTemplates,
      })
      
      moments.forEach(m => {
        allStories.push({
          ...m,
          playerName: member.name || 'Member',
        })
      })
    })

    return allStories.sort((a, b) => b.priority - a.priority || (b.matchDate || '').localeCompare(a.matchDate || ''))
  }, [members, matches])

  // Featured stories actually displayed on the homepage
  const featuredStories = useMemo(() => {
    if (pinnedStoryIds.length > 0) {
      const pinned = allClubStories.filter((s: StoryMoment & { playerName: string }) => pinnedStoryIds.includes(s.id))
      if (pinned.length > 0) return pinned
    }

    const exciting = allClubStories.filter((s: StoryMoment & { playerName: string }) => s.type !== 'latest_result')
    const fallbackList = exciting.length > 0 ? exciting : allClubStories
    return fallbackList.slice(0, 4)
  }, [allClubStories, pinnedStoryIds])

  const [activeTab, setActiveTab] = useState<'overview' | 'scores' | 'leaderboard' | 'members' | 'noticeboard'>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    const validTabs = ['overview', 'scores', 'leaderboard', 'members', 'noticeboard']
    return (tabParam && validTabs.includes(tabParam)) ? (tabParam as 'overview' | 'scores' | 'leaderboard' | 'members' | 'noticeboard') : 'overview'
  })
  const [showCelebrationModal, setShowCelebrationModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [actionError, setActionError] = useState('')

  // Modals state
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchWithDetails | null>(null)
  const [selectedScoreEventId, setSelectedScoreEventId] = useState<string | null>(null)
  const [selectedScoreEventTitle, setSelectedScoreEventTitle] = useState<string | null>(null)
  const [selectedScoreEventDate, setSelectedScoreEventDate] = useState<string | null>(null)

  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  const [showHighlightsEvent, setShowHighlightsEvent] = useState<ClubEvent | null>(null)
  const [shareMatch, setShareMatch] = useState<MatchWithDetails | null>(null)

  // Sync tab query parameter with activeTab state
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const validTabs = ['overview', 'scores', 'leaderboard', 'members', 'noticeboard']
    if (tabParam && validTabs.includes(tabParam)) {
      if (tabParam !== activeTab) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(tabParam as 'overview' | 'scores' | 'leaderboard' | 'members' | 'noticeboard')
      }
    }
  }, [searchParams, activeTab])

  useEffect(() => {
    if (searchParams.get('celebrate') === 'true') {
      const timeout = window.setTimeout(() => {
        setShowCelebrationModal(true)
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('celebrate')
        setSearchParams(newParams, { replace: true })
      }, 0)

      return () => window.clearTimeout(timeout)
    }
  }, [searchParams, setSearchParams])

  if (clubLoading || membershipLoading || authLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading...</CardContent>
      </Card>
    )
  }

  if (!clubId || !club) return <Navigate to="/not-found" replace />

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = myMembership?.status === 'active' || user?.role === 'superadmin'
  const inviteUrl = club.invite_code ? buildInviteUrl(club.invite_code) : ''

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('General request link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const loadJoinRequests = async () => {
    if (!clubId || !isAdmin) return
    try {
      setIsLoadingRequests(true)
      const requests = await getClubJoinRequests(clubId)
      setJoinRequests(requests)
    } catch (err) {
      console.error('Failed to load join requests:', err)
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveJoinRequest(requestId)
      setSuccessMessage('Request approved.')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId)
      setSuccessMessage('Request rejected.')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject request')
    }
  }

  // Score modal controllers
  const closeScoreModal = () => {
    setShowScoreModal(false)
    setEditingMatch(null)
    setSelectedScoreEventId(null)
    setSelectedScoreEventTitle(null)
    setSelectedScoreEventDate(null)
  }

  const handleCreateScore = () => {
    setEditingMatch(null)
    setSelectedScoreEventId(null)
    setSelectedScoreEventTitle(null)
    setSelectedScoreEventDate(null)
    setShowScoreModal(true)
  }

  const handleCreateScoreForEvent = (event: ClubEvent) => {
    setEditingMatch(null)
    setSelectedScoreEventId(event.id)
    setSelectedScoreEventTitle(event.title)
    const evDateStr = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : null
    setSelectedScoreEventDate(evDateStr)
    setShowScoreModal(true)
  }

  const handleEditMatch = (match: MatchWithDetails) => {
    setEditingMatch(match)
    setSelectedScoreEventId(match.event_id || null)
    setShowScoreModal(true)
  }

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}
      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Header Cover Banner */}
        <ClubHeader 
          clubId={clubId} 
          setSuccessMessage={setSuccessMessage} 
          setActionError={setActionError} 
        />

        {/* Tab Navigation */}
        <div className="border-b border-[var(--arena-border)] flex gap-1 overflow-x-auto whitespace-nowrap">
          {([
            { id: 'overview', label: 'Home', icon: Home },
            { id: 'scores', label: 'Scores', icon: Activity },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'noticeboard', label: 'Notice Board', icon: Megaphone }
          ] as const).map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  const newParams = new URLSearchParams(window.location.search)
                  newParams.set('tab', tab.id)
                  setSearchParams(newParams, { replace: true })
                }}
                className={`px-3 py-2 font-semibold text-xs sm:text-sm border-b-2 transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[var(--arena-accent)] text-[var(--arena-accent)] bg-[var(--arena-surface)]'
                    : 'border-transparent text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] hover:border-[var(--arena-border)]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Pinned noticeboard announcements */}
            {club.announcement ? (
              <div className="rounded-xl border border-amber-250 bg-amber-50/60 p-3 shadow-sm sm:rounded-2xl sm:p-4 animate-fade-in">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface)] text-amber-700 shadow-sm border border-amber-200">
                    <Megaphone size={18} aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h3 className="text-sm font-bold text-amber-900">Pinned Announcement</h3>
                      {club.announcement_updated_at ? (
                        <span className="text-xs text-amber-600">
                          Updated {new Date(club.announcement_updated_at).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-amber-850 leading-relaxed whitespace-pre-wrap">
                      {club.announcement}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Club actions quick access */}
            {isMember ? (
              <Card className="border-blue-200 bg-blue-50/60">
                <CardContent className="space-y-3 pt-4 sm:pt-5">
                  <div className="flex items-center gap-2 text-blue-800">
                    <ShieldCheck size={18} aria-hidden="true" />
                    <h2 className="font-bold">{isAdmin ? 'Admin controls' : 'Club quick actions'}</h2>
                  </div>
                  <div className={`grid gap-2 ${
                    isAdmin ? 'grid-cols-3' : (inviteUrl ? 'grid-cols-2' : 'grid-cols-1')
                  }`}>
                    <button
                      type="button"
                      onClick={handleCreateScore}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer"
                    >
                      <ClipboardPenLine size={18} className="text-blue-700" aria-hidden="true" />
                      <span className="text-[10px] font-bold leading-tight">Record Score</span>
                    </button>
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyInviteLink}
                          disabled={!inviteUrl}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <UserPlus size={18} className="text-blue-700" aria-hidden="true" />
                          <span className="text-[10px] font-bold leading-tight">Copy Invite</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { loadJoinRequests(); setShowJoinRequestsModal(true) }}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer"
                        >
                          <UserPlus size={18} className="text-blue-700" aria-hidden="true" />
                          <span className="text-[10px] font-bold leading-tight">Requests</span>
                        </button>
                      </>
                    ) : (
                      inviteUrl && (
                        <button
                          type="button"
                          onClick={handleCopyInviteLink}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer"
                        >
                          <UserPlus size={18} className="text-blue-700" aria-hidden="true" />
                          <span className="text-[10px] font-bold leading-tight">Copy Invite</span>
                        </button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Latest Session Summary Inline */}
            {latestSessionInfo && latestHighlights && (
              <div className="rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] p-4 space-y-4 shadow-xl">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-[var(--arena-accent)]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Latest Session Highlights</h3>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--arena-text-dim)]">
                    {new Date(latestSessionInfo.date).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--arena-border)]/50 pb-3">
                  <span className="text-[10px] font-mono text-[var(--arena-accent)] bg-[var(--arena-accent-soft)] px-2 py-0.5 rounded border border-[var(--arena-accent)]/20 uppercase tracking-wider">
                    🏸 {latestSessionInfo.title}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--arena-text-dim)]">
                    {latestSessionInfo.matches.length} Matches Scored
                  </span>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  {/* MVP (King of the Court) */}
                  {latestHighlights.mvp && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 relative hover:bg-amber-500/10 transition-colors duration-150">
                      <span className="absolute top-2 right-2 text-sm">👑</span>
                      <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-none">MVP (King of Court)</p>
                      <p className="text-sm font-black text-white truncate mt-2">{latestHighlights.mvp.name}</p>
                      <p className="text-[10px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                        <span>🏆</span>
                        <span>{Math.round(latestHighlights.mvp.winRate)}% Win Rate ({latestHighlights.mvp.wins}W-{latestHighlights.mvp.losses}L)</span>
                      </p>
                    </div>
                  )}

                  {/* Hot Streak */}
                  {latestHighlights.streakStar && (
                    <div className="rounded-lg border border-[var(--arena-accent)]/25 bg-[var(--arena-accent-soft)]/20 p-3 relative hover:bg-[var(--arena-accent-soft)]/30 transition-colors duration-150">
                      <span className="absolute top-2 right-2 text-sm">🔥</span>
                      <p className="text-[8px] font-black text-[var(--arena-accent)] uppercase tracking-widest leading-none">Streak Star</p>
                      <p className="text-sm font-black text-white truncate mt-2">{latestHighlights.streakStar.name}</p>
                      <p className="text-[10px] text-[var(--arena-accent)] font-semibold mt-1 flex items-center gap-1">
                        <span>📈</span>
                        <span>{latestHighlights.streakStar.longestStreak} Match Win Streak</span>
                      </p>
                    </div>
                  )}

                  {/* Resilience Award */}
                  {latestHighlights.resilience && (
                    <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 relative hover:bg-sky-500/10 transition-colors duration-150">
                      <span className="absolute top-2 right-2 text-sm">💪</span>
                      <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest leading-none">Resilience Award</p>
                      <p className="text-sm font-black text-white truncate mt-2">{latestHighlights.resilience.name}</p>
                      <p className="text-[10px] text-sky-300 font-semibold mt-1 flex items-center gap-1">
                        <span>🏸</span>
                        <span>Played {latestHighlights.resilience.games} Matches</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Featured Club Stories */}
            {featuredStories.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-white">
                    <Activity size={16} className="text-[var(--arena-lime)]" />
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-100 flex items-center gap-2">
                      Featured Player Stories
                      {pinnedStoryIds.length === 0 && (
                        <span className="text-[9px] lowercase font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded">
                          (auto-selected)
                        </span>
                      )}
                    </h3>
                  </div>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowStorySelectorModal(true)}
                      className="text-[10px] font-black uppercase h-7 px-2 border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      Manage Features
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {featuredStories.map((story: StoryMoment & { playerName: string }) => (
                    <div key={story.id} className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 flex flex-col justify-between hover:border-slate-700 transition-all duration-150">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] font-bold text-[var(--arena-lime)] uppercase tracking-wider bg-[var(--arena-lime)]/10 border border-[var(--arena-lime)]/20 px-1.5 py-0.5 rounded">
                            {story.title}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {story.matchDate ? new Date(story.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed mt-2 font-medium">
                          {story.body}
                        </p>
                      </div>
                      
                      <div className="border-t border-slate-800 mt-3 pt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono text-slate-400 truncate">
                          {story.proofLabel}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleTogglePinStory(story.id)}
                              className={`text-[9px] font-black uppercase flex items-center gap-0.5 cursor-pointer hover:underline ${
                                pinnedStoryIds.includes(story.id)
                                  ? 'text-yellow-400'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title={pinnedStoryIds.includes(story.id) ? "Unfeature Story" : "Feature Story"}
                            >
                              ★ {pinnedStoryIds.includes(story.id) ? 'Featured' : 'Feature'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `🔥 *${story.title}*\n${story.body}\n\n${story.proofLabel}\n📍 ${club.name}`
                              )
                              setSuccessMessage('Story copied to clipboard!')
                              setTimeout(() => setSuccessMessage(''), 2000)
                            }}
                            className="text-[9px] font-black uppercase text-[var(--arena-lime)] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                          >
                            <Share2 size={10} />
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming events calendar */}
            <ClubEventsCalendar 
              clubId={clubId} 
              onRecordScoreForEvent={handleCreateScoreForEvent}
              onViewHighlightsForEvent={setShowHighlightsEvent}
              setSuccessMessage={setSuccessMessage}
              setActionError={setActionError}
            />
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="animate-fade-in">
            <ClubScoresFeed 
              clubId={clubId} 
              onEditMatch={handleEditMatch}
              onShareMatch={setShareMatch}
              setSuccessMessage={setSuccessMessage}
              setActionError={setActionError}
            />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <ClubLeaderboard 
            clubId={clubId} 
            setSuccessMessage={setSuccessMessage} 
            setActionError={setActionError}
          />
        )}

        {activeTab === 'members' && (
          <div className="grid gap-4 lg:gap-5 lg:grid-cols-[1.15fr_0.85fr] items-start animate-fade-in">
            <div>
              <ClubMembersRoster
                clubId={clubId}
                clubName={club.name}
                members={members}
                myMembership={myMembership || null}
                setSuccessMessage={setSuccessMessage}
                setActionError={setActionError}
              />
            </div>
            <div>
              <ClubMembersSidebar clubId={clubId} hideRosterPreview={true} />
            </div>
          </div>
        )}

        {activeTab === 'noticeboard' && (
          <ClubNoticeboard 
            clubId={clubId} 
            setSuccessMessage={setSuccessMessage} 
            setActionError={setActionError} 
          />
        )}
      </div>

      {/* Modals & Portals */}
      {showJoinRequestsModal && isAdmin ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => setShowJoinRequestsModal(false)}>
          <Card className="max-h-[92vh] w-full overflow-auto rounded-b-none sm:max-w-lg sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--arena-text)]">Join requests</h2>
                  <p className="text-sm text-[var(--arena-text-muted)]">Approve or reject pending member requests. Email verification is required before approval.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowJoinRequestsModal(false)} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              {isLoadingRequests ? (
                <p className="text-sm text-[var(--arena-text-muted)]">Loading...</p>
              ) : joinRequests.length ? (
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="grid gap-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[var(--arena-text)]">{request.name || 'Unknown member'}</h3>
                        <p className="break-words text-sm text-[var(--arena-text-muted)]">{request.email}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button size="sm" type="button" onClick={() => handleApproveRequest(request.id)}>Approve</Button>
                        <Button size="sm" variant="secondary" type="button" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">No pending join requests.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showStorySelectorModal && isAdmin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowStorySelectorModal(false)}>
          <Card className="max-h-[85vh] w-full overflow-hidden flex flex-col rounded-xl sm:max-w-xl border-[var(--arena-border)] bg-[var(--arena-surface)] shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--arena-border)] flex items-center justify-between shrink-0 bg-slate-950/40">
              <div>
                <h3 className="text-base font-black uppercase text-white tracking-tight">Feature Player Stories</h3>
                <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">Select which exciting moments to display on the club homepage.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg text-slate-400 hover:text-white" onClick={() => setShowStorySelectorModal(false)} aria-label="Close">
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {allClubStories.length === 0 ? (
                <p className="text-xs text-[var(--arena-text-dim)] text-center py-8">No player stories generated yet. Record some matches to create stories!</p>
              ) : (
                allClubStories.map((story: StoryMoment & { playerName: string }) => {
                  const isPinned = pinnedStoryIds.includes(story.id)
                  return (
                    <div
                      key={story.id}
                      onClick={() => handleTogglePinStory(story.id)}
                      className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer flex gap-3 items-start select-none ${
                        isPinned
                          ? 'border-[var(--arena-accent)]/40 bg-[var(--arena-accent-soft)] text-white'
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={() => {}} // handled by parent click
                        className="mt-1 accent-[var(--arena-accent)] shrink-0 pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--arena-lime)]">
                            {story.playerName} • {story.title}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {story.matchDate ? new Date(story.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed line-clamp-2">{story.body}</p>
                        <p className="text-[9px] font-mono text-slate-500 mt-1">{story.proofLabel}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            
            <div className="p-4 border-t border-[var(--arena-border)] flex justify-end shrink-0 bg-slate-950/40">
              <Button
                type="button"
                onClick={() => setShowStorySelectorModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ScoreRecordingModal
        isOpen={showScoreModal}
        onClose={closeScoreModal}
        clubId={clubId}
        editingMatch={editingMatch}
        eventId={selectedScoreEventId || undefined}
        eventTitle={selectedScoreEventTitle || undefined}
        eventDate={selectedScoreEventDate || undefined}
        clubName={club.name}
        onScoreRecorded={closeScoreModal}
      />

      {showHighlightsEvent && (
        <SessionHighlightsWidget
          isOpen={!!showHighlightsEvent}
          onClose={() => setShowHighlightsEvent(null)}
          event={showHighlightsEvent}
          matches={matches}
          members={members}
          onShareMatch={setShareMatch}
        />
      )}

      {shareMatch ? (
        <ScorecardShareModal
          match={shareMatch}
          clubName={club.name}
          onClose={() => setShareMatch(null)}
        />
      ) : null}

      {showCelebrationModal ? (
        <>
          <CelebrationConfetti />
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowCelebrationModal(false)}>
            <Card className="relative w-full max-w-md overflow-hidden rounded-2xl border-none bg-[var(--arena-surface)] text-center shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
              <CardContent className="space-y-6 px-6 pt-10 pb-8 sm:px-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] shadow-inner animate-bounce">
                  <span className="text-4xl">🎉</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--arena-accent)]">Congratulations!</p>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[var(--arena-text)]">
                    Welcome to the Club!
                  </h2>
                  <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
                    You are now an active member of <strong className="text-[var(--arena-text)]">{club.name}</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[var(--arena-surface-muted)] p-4 text-left space-y-3">
                  <div className="flex items-center gap-3">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={`${club.name} logo`} className="h-10 w-10 rounded-full object-cover border border-[var(--arena-border)]" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--arena-accent)] text-white font-bold">
                        {club.name[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-[var(--arena-text)] leading-tight">{club.name}</h4>
                      <p className="text-xs text-[var(--arena-text-dim)]">{club.city || 'Local Club'}</p>
                    </div>
                  </div>
                  {club.description && (
                    <p className="text-xs text-[var(--arena-text-muted)] italic line-clamp-2 leading-relaxed border-t border-[var(--arena-border)]/60 pt-2.5">
                      "{club.description}"
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-left text-xs">
                  <p className="font-bold text-[var(--arena-text-muted)] uppercase tracking-wide">Next steps:</p>
                  <ul className="space-y-2.5 text-[var(--arena-text-muted)] pl-1">
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-[var(--arena-accent)]">1</span>
                      <span>Check the **Upcoming Sessions** below and submit your RSVP.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-[var(--arena-accent)]">2</span>
                      <span>View recent match history and record set scores to update the ELO leaderboard.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    fullWidth
                    onClick={() => setShowCelebrationModal(false)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/10 font-bold"
                  >
                    Let's Play! 🏸
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </Page>
  )
}
