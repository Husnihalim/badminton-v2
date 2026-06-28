import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, Shield, Trophy, ChevronLeft, Users, User as UserIcon, Share2, Edit3 } from 'lucide-react'
import { getProfile } from '../lib/api/profiles'
import { getClubLeaderboard, getClubMatches } from '../lib/api/matches'
import { getClubMembers } from '../lib/api/clubs'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Club, MatchWithDetails, User } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'
import { cn } from '../lib/utils'
import { MatchScoreboard } from '../components/MatchScoreboard'
import ScorecardShareModal from '../components/ScorecardShareModal'
import { PlayerCard } from '../components/PlayerCard'
import { calculatePlayerInsights, getSignatureMoment } from '../lib/insights'
import { Badge } from '../components/ui/badge'

type MemberEloHistoryRow = {
  id: string
  profile_id: string
  match_id: string
  match_type: 'singles' | 'doubles'
  elo_before: number
  elo_after: number
  delta: number
  k_factor: number
  opponent_rating_avg: number
  partner_rating?: number | null
  created_at: string
  matches?: {
    title?: string | null
    match_date?: string | null
  } | null
}

export default function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [profile, setProfile] = useState<User | null>(null)
  const [clubs, setClubs] = useState<(Club & { singles_elo?: number | null; doubles_elo?: number | null })[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareMatch, setShareMatch] = useState<MatchWithDetails | null>(null)
  const [eloHistory, setEloHistory] = useState<MemberEloHistoryRow[]>([])
  const [allUserMatches, setAllUserMatches] = useState<MatchWithDetails[]>([])
  const [clubRanks, setClubRanks] = useState<Record<string, { rank: number; total: number }>>({})
  const [memberProfilesMap, setMemberProfilesMap] = useState<Record<string, { userId: string; avatarUrl: string | null }>>({})
  const [toastMessage, setToastMessage] = useState('')

  const [personalStats, setPersonalStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    streak: 0,
    streakType: null as 'win' | 'loss' | null,
  })

  const [achievements, setAchievements] = useState({
    onFire: false,
    giantSlayer: false,
    cleanSweep: false,
    ironMan: false,
    dynamicDuo: false,
  })

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'clubs'>(() => {
    const tabParam = searchParams.get('tab')
    if (['overview', 'matches', 'clubs'].includes(tabParam || '')) {
      return tabParam as 'overview' | 'matches' | 'clubs'
    }
    return 'overview'
  })

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview', 'matches', 'clubs'].includes(tabParam) && tabParam !== activeTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam as 'overview' | 'matches' | 'clubs')
    }
  }, [searchParams, activeTab])

  const isOwner = currentUser?.id === userId
  const showFullProfile = !profile?.is_private || isOwner
  const displayName = profile?.display_name || profile?.name || 'Unknown Player'

  const loadProfileData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')

    try {
      // 1. Fetch Profile Info
      const userProfile = await getProfile(userId)
      if (!userProfile) {
        setError('User profile not found.')
        setLoading(false)
        return
      }
      setProfile(userProfile)

      // 2. Fetch User's Clubs and global Elo ratings
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('club_id, clubs(*)')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError)
      }

      // Get global Elo from profile
      const userProfileElo = {
        singles_elo: userProfile.singles_elo ?? 1200,
        doubles_elo: userProfile.doubles_elo ?? 1200,
      }

      const userClubs = (membershipData as unknown as Array<{ club_id: string; clubs: Club }> || [])
        .map((m) => {
          if (!m.clubs) return null
          return {
            ...m.clubs,
            singles_elo: userProfileElo.singles_elo,
            doubles_elo: userProfileElo.doubles_elo,
          }
        })
        .filter((c): c is Club & { singles_elo: number; doubles_elo: number } => c !== null)
      setClubs(userClubs)

      // 3. Fetch Matches if profile is public
      if (!userProfile.is_private || currentUser?.id === userId) {
        const allMatches: MatchWithDetails[] = []
        const clubLeaderboards: Record<string, Record<string, number>> = {}

        // Fetch Elo History from global table
        supabase
          .from('elo_history_global')
          .select(`
            id,
            profile_id,
            match_id,
            match_type,
            elo_before,
            elo_after,
            delta,
            k_factor,
            opponent_rating_avg,
            partner_rating,
            created_at,
            matches(title, match_date)
          `)
          .eq('profile_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data: eloData, error: eloError }) => {
            if (eloError) {
              console.error('Error fetching Elo history:', eloError)
            } else {
              setEloHistory((eloData || []) as unknown as MemberEloHistoryRow[])
            }
          })

        // Fetch matches, leaderboards and members for each club
        const ranks: Record<string, { rank: number; total: number }> = {}
        const profilesMap: Record<string, { userId: string; avatarUrl: string | null }> = {}

        await Promise.all(
          userClubs.map(async (club) => {
            try {
              const [clubMatches, leaderboardRows, members] = await Promise.all([
                getClubMatches(club.id),
                getClubLeaderboard(club.id, 100),
                getClubMembers(club.id),
              ])
              
              allMatches.push(...clubMatches)

              // Build leaderboard map and capture this user's rank based on Elo ranking
              const normalizeName = (value?: string | null) => (value || '').trim().toLowerCase()
              const viewedName = normalizeName(userProfile.display_name) || normalizeName(userProfile.name)

              // Only rank members who have played at least one match
              const activeMembersWithMatches = members.filter(m =>
                leaderboardRows.some(row =>
                  normalizeName(row.name) === normalizeName(m.name)
                )
              )

              // Sort by global singles Elo DESC, then join date ASC
              const sortedMembers = [...activeMembersWithMatches].sort((a, b) => {
                const eloA = a.singles_elo ?? 1200
                const eloB = b.singles_elo ?? 1200
                if (eloB !== eloA) return eloB - eloA
                return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
              })

              const index = sortedMembers.findIndex(
                m => normalizeName(m.name) === viewedName || m.user_id === userProfile.id
              )

              if (index !== -1) {
                ranks[club.id] = { rank: index + 1, total: sortedMembers.length }
              }

              const lbMap: Record<string, number> = {}
              sortedMembers.forEach((m, sIdx) => {
                lbMap[normalizeName(m.name)] = sIdx + 1
              })
              clubLeaderboards[club.id] = lbMap

              members.forEach((m) => {
                const mName = m.name || 'Unknown'
                if (m.user_id) {
                  profilesMap[mName.toLowerCase()] = {
                    userId: m.user_id,
                    avatarUrl: m.avatar_url ?? null,
                  }
                }
              })
            } catch (e) {
              console.error(`Error loading matches for club ${club.id}:`, e)
            }
          })
        )

        setClubRanks(ranks)
        setMemberProfilesMap(profilesMap)

        // Filter user matches
        const userMatches = allMatches.filter((m) =>
          m.participants.some((p) => p.user_id === userId)
        )

        // De-duplicate matches
        const uniqueMatchesMap = new Map<string, MatchWithDetails>()
        userMatches.forEach((m) => {
          if (m.id) uniqueMatchesMap.set(m.id, m)
        })
        const sortedUniqueMatches = Array.from(uniqueMatchesMap.values()).sort(
          (a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime()
        )

        setMatches(sortedUniqueMatches.slice(0, 10))
        setAllUserMatches(sortedUniqueMatches)

        // Calculate stats
        let winsCount = 0
        let lossesCount = 0
        sortedUniqueMatches.forEach((m) => {
          const part = m.participants.find((p) => p.user_id === userId)
          if (!part) return

          const scoreSets = m.score_sets || []
          if (scoreSets.length === 0) return

          const t1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
          const t2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
          if (t1Sets === t2Sets) return

          const winningTeam = t1Sets > t2Sets ? 1 : 2
          if (part.team === winningTeam) winsCount++
          else lossesCount++
        })

        const totalPlayed = winsCount + lossesCount
        const winRateVal = totalPlayed > 0 ? Math.round((winsCount / totalPlayed) * 100) : 0

        // Calculate Streak
        let activeStreak = 0
        let activeStreakType: 'win' | 'loss' | null = null

        for (const m of sortedUniqueMatches) {
          const part = m.participants.find((p) => p.user_id === userId)
          if (!part) continue

          const scoreSets = m.score_sets || []
          if (scoreSets.length === 0) continue

          const t1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
          const t2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
          if (t1Sets === t2Sets) continue

          const winningTeam = t1Sets > t2Sets ? 1 : 2
          const won = part.team === winningTeam
          const matchType: 'win' | 'loss' = won ? 'win' : 'loss'

          if (activeStreakType === null) {
            activeStreakType = matchType
            activeStreak = 1
          } else if (activeStreakType === matchType) {
            activeStreak++
          } else {
            break
          }
        }

        setPersonalStats({
          matchesPlayed: totalPlayed,
          wins: winsCount,
          losses: lossesCount,
          winRate: winRateVal,
          streak: activeStreak,
          streakType: activeStreakType,
        })

        // Calculate Achievements
        const onFire = activeStreakType === 'win' && activeStreak >= 3
        let giantSlayer = false
        let cleanSweep = false
        let ironMan = false
        let dynamicDuo = false

        // Iron Man Check (3 matches in 1 day)
        const dateCounts: Record<string, number> = {}
        sortedUniqueMatches.forEach((m) => {
          const d = new Date(m.match_date || m.created_at).toDateString()
          dateCounts[d] = (dateCounts[d] || 0) + 1
          if (dateCounts[d] >= 3) ironMan = true
        })

        // Dynamic Duo Check (3 doubles win streak)
        let doublesWinStreak = 0
        for (const m of sortedUniqueMatches) {
          if (m.match_type !== 'doubles') continue
          const part = m.participants.find((p) => p.user_id === userId)
          if (!part) continue
          const scoreSets = m.score_sets || []
          if (scoreSets.length === 0) continue

          const t1 = scoreSets.filter((s) => s.team1_score > s.team2_score).length
          const t2 = scoreSets.filter((s) => s.team2_score > s.team1_score).length
          if (t1 === t2) continue

          const won = part.team === (t1 > t2 ? 1 : 2)
          if (won) {
            doublesWinStreak++
            if (doublesWinStreak >= 3) dynamicDuo = true
          } else {
            break
          }
        }

        // Giant slayer & Clean Sweep check
        for (const m of sortedUniqueMatches) {
          const part = m.participants.find((p) => p.user_id === userId)
          if (!part) continue
          const scoreSets = m.score_sets || []
          
          // Clean Sweep Check
          const hasCleanSweepSet = scoreSets.some(s => Math.abs(s.team1_score - s.team2_score) >= 10)
          if (hasCleanSweepSet) cleanSweep = true

          // Giant Slayer Check (Opponent has global singles Elo > 100 points higher)
          const ELO_DIFF_GIANT_SLAYER = 100
          const myRating = userProfileElo.singles_elo || 1200
          if (part.team === (scoreSets.filter(s => s.team1_score > s.team2_score).length > scoreSets.filter(s => s.team2_score > s.team1_score).length ? 1 : 2)) {
            const oppTeam = part.team === 1 ? 2 : 1
            const opponentsList = m.participants.filter(p => p.team === oppTeam)
            for (const opp of opponentsList) {
              if (opp.user_id) {
                const { data: oppProfile } = await supabase
                  .from('profiles')
                  .select('singles_elo')
                  .eq('id', opp.user_id)
                  .single()
                
                if (oppProfile && oppProfile.singles_elo && (oppProfile.singles_elo - myRating) >= ELO_DIFF_GIANT_SLAYER) {
                  giantSlayer = true
                  break
                }
              }
            }
          }
          if (giantSlayer) break
        }

        setAchievements({ onFire, giantSlayer, cleanSweep, ironMan, dynamicDuo })
      }
    } catch (err) {
      console.error('Error loading profile data:', err)
      setError('Failed to load profile details.')
    } finally {
      setLoading(false)
    }
  }, [userId, currentUser, setMemberProfilesMap])

  // Calculate dynamic insights client-side
  const playerInsights = useMemo(() => {
    if (!profile || allUserMatches.length === 0) return null
    return calculatePlayerInsights(
      allUserMatches,
      profile.id,
      profile.name,
      profile.display_name,
      memberProfilesMap
    )
  }, [allUserMatches, profile, memberProfilesMap])

  // Extract signature moment dynamically from match history
  const signatureMoment = useMemo(() => {
    if (!profile) return null
    return getSignatureMoment(allUserMatches, profile.id)
  }, [allUserMatches, profile])

  // Format stats for PlayerCard
  const playerCardStats = useMemo(() => {
    if (!profile) return undefined
    const form = matches.slice(0, 5).map((m) => {
      const userPart = m.participants?.find((p) => p.user_id === profile.id)
      if (!userPart || !m.score_sets?.length) return { won: false, setScores: 'Unknown' }
      const t1Sets = m.score_sets.filter((s) => s.team1_score > s.team2_score).length
      const t2Sets = m.score_sets.filter((s) => s.team2_score > s.team1_score).length
      const won =
        (t1Sets > t2Sets && userPart.team === 1) || (t2Sets > t1Sets && userPart.team === 2)
      const scoreText = m.score_sets
        .map((s) => `${s.team1_score}-${s.team2_score}`)
        .join(', ')
      return { won, setScores: scoreText }
    })
    return {
      matchesPlayed: personalStats.matchesPlayed,
      wins: personalStats.wins,
      losses: personalStats.losses,
      winRate: personalStats.winRate,
      streak: personalStats.streak,
      streakType: personalStats.streakType,
      form,
    }
  }, [personalStats, matches, profile])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfileData()
  }, [loadProfileData])

  const handleShare = () => {
    if (!userId) return
    const shareUrl = `${window.location.origin}/member/${userId}`
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setToastMessage('Link copied to clipboard!')
        setTimeout(() => setToastMessage(''), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy link:', err)
      })
  }

  if (loading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading profile...</CardContent>
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="space-y-4 pt-5 text-center">
          <p className="text-sm text-red-600 font-semibold">{error || 'An error occurred.'}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  const primaryClub = clubs[0]
  const primaryRank = primaryClub && clubRanks[primaryClub.id] ? clubRanks[primaryClub.id] : null

  return (
    <Page>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="modal-toast animate-fade-in z-50">
          {toastMessage}
        </div>
      )}

      {/* Back button */}
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-[var(--arena-text-muted)] hover:text-slate-900 pl-0">
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      {/* Header Info */}
      <PageHeader
        eyebrow="Member Profile"
        title={displayName}
        description={`Athlete overview and badminton rankings for ${displayName}`}
        actions={
          <>
            {isOwner && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => navigate('/profile')}
                className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg"
                title="Edit profile"
              >
                <Edit3 size={14} aria-hidden="true" stroke="currentColor" />
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg"
              title="Share Link"
            >
              <Share2 size={14} aria-hidden="true" stroke="currentColor" />
            </Button>
          </>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-[var(--arena-border)] flex gap-1 overflow-x-auto whitespace-nowrap pt-2">
        {([
          { id: 'overview', label: 'Player Card', icon: UserIcon },
          { id: 'matches', label: 'Matches', icon: Activity },
          { id: 'clubs', label: 'Clubs', icon: Users }
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
              className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
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

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Core player card */}
          <PlayerCard
            profile={profile}
            stats={playerCardStats}
            rank={primaryRank}
            elo={primaryClub?.singles_elo ?? 1200}
            isOwner={isOwner}
            primaryClubName={primaryClub?.name}
            bestPartner={playerInsights?.bestPartner}
            topRival={playerInsights?.topRival}
            signatureMoment={signatureMoment}
            onShare={handleShare}
            onTabChange={(tab) => {
              setActiveTab(tab)
              const newParams = new URLSearchParams(window.location.search)
              newParams.set('tab', tab)
              setSearchParams(newParams, { replace: true })
            }}
          />

          {/* Unlocked Achievements */}
          {showFullProfile && (
            <section className="space-y-4 rounded-xl border border-[var(--arena-border)] bg-surface p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-[var(--arena-text)] flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500 shrink-0" />
                  Unlocked Achievements
                </h2>
                <p className="text-[11px] text-[var(--arena-text-dim)] mt-0.5">Badges earned by this player from club gameplay.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <AchievementBadge
                  unlocked={achievements.onFire}
                  title="On Fire"
                  description="3+ Win Streak"
                  icon="🔥"
                  glowClass="shadow-orange-500/10 border-orange-200 bg-orange-50/50 text-orange-600"
                  lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.giantSlayer}
                  title="Giant Slayer"
                  description="Beat a higher ELO player"
                  icon="🛡️"
                  glowClass="shadow-blue-500/10 border-blue-200 bg-blue-50/50 text-blue-600"
                  lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.cleanSweep}
                  title="Clean Sweep"
                  description="Win set by 10+ pts"
                  icon="🎯"
                  glowClass="shadow-emerald-500/10 border-emerald-200 bg-[var(--arena-accent-soft)]/50 text-[var(--arena-accent)]"
                  lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.ironMan}
                  title="Iron Man"
                  description="Play 3+ matches in 1 day"
                  icon="🚀"
                  glowClass="shadow-purple-500/10 border-purple-200 bg-purple-50/50 text-purple-600"
                  lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.dynamicDuo}
                  title="Dynamic Duo"
                  description="3+ doubles wins streak"
                  icon="🤝"
                  glowClass="shadow-amber-500/10 border-amber-200 bg-amber-50/50 text-amber-600"
                  lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
              </div>
            </section>
          )}

          {!showFullProfile && (
            <div className="rounded-xl border border-dashed border-[var(--arena-border)] p-8 text-center bg-[var(--arena-surface-muted)] mt-4 space-y-3">
              <Shield size={36} className="text-[var(--arena-text-dim)] mx-auto" />
              <h2 className="text-base font-bold text-slate-800">Stats are private</h2>
              <p className="text-sm text-[var(--arena-text-dim)] max-w-sm mx-auto">
                This member has set their profile to private. Their stats, milestones, and match logs are hidden.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-6">
          {showFullProfile ? (
            <>
              {/* Elo History Card */}
              {eloHistory.length > 0 && (
                <section className="space-y-4 rounded-xl border border-[var(--arena-border)] bg-surface p-4 shadow-sm sm:p-5">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--arena-text)] flex items-center gap-2">
                      <Activity size={16} className="text-[var(--arena-accent)] shrink-0" />
                      Elo Rating Progression
                    </h2>
                    <p className="text-[11px] text-[var(--arena-text-dim)] mt-0.5">Recent rating changes from club matches.</p>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                    {eloHistory.map((item) => {
                      const ratingDiff = item.delta
                      const isGain = ratingDiff >= 0
                      const matchTitle = item.matches?.title || 'Match'
                      const dateStr = new Date(item.matches?.match_date || item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      const matchTypeLabel = item.match_type === 'doubles' ? 'Doubles' : 'Singles'
                      
                      return (
                        <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 truncate block">
                              {matchTitle}
                            </span>
                            <span className="text-[10px] text-[var(--arena-text-dim)] font-semibold block">
                              {matchTypeLabel} · {dateStr}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono text-[var(--arena-text-dim)]">
                              {item.elo_before} → <span className="font-extrabold text-slate-900">{item.elo_after}</span>
                            </span>
                            <span className={cn(
                              "inline-flex items-center justify-center font-extrabold px-1.5 py-0.5 rounded text-[10px] w-12 text-center",
                              isGain 
                                ? "bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-emerald-100" 
                                : "bg-red-50 text-red-700 border border-red-100"
                            )}>
                              {isGain ? `+${ratingDiff}` : ratingDiff}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Match Logs */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-[var(--arena-text)]">Recent Matches</h2>
                {matches.length ? (
                  <div className="grid gap-3">
                    {matches.map((match) => (
                      <MatchScoreboard
                        key={match.id}
                        match={match}
                        onShare={setShareMatch}
                        showClubName={true}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-dim)]">
                    No matches recorded yet.
                  </p>
                )}
              </section>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--arena-border)] p-8 text-center bg-[var(--arena-surface-muted)] space-y-3">
              <Shield size={36} className="text-[var(--arena-text-dim)] mx-auto" />
              <h2 className="text-base font-bold text-slate-800">Match log is private</h2>
              <p className="text-sm text-[var(--arena-text-dim)] max-w-sm mx-auto">
                Matches and Elo history logs are hidden for private profiles.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'clubs' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--arena-text)]">Clubs List</h2>
          {clubs.length ? (
            <div className="grid gap-3">
              {clubs.map((club) => (
                <Card 
                  key={club.id} 
                  className="hover:border-[var(--arena-accent)]/30 transition-all duration-150 cursor-pointer"
                  onClick={() => navigate(`/club/${club.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white">{club.name}</h3>
                      <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">{club.city || 'No Location'}</p>
                    </div>
                    {clubRanks[club.id] && (
                      <Badge className="bg-[var(--arena-accent-soft)] border border-[var(--arena-accent)]/20 text-[var(--arena-accent)]">
                        Rank #{clubRanks[club.id].rank}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-dim)]">
              No joined clubs.
            </p>
          )}
        </div>
      )}

      {/* Modals */}
      {shareMatch ? (
        <ScorecardShareModal
          match={shareMatch}
          clubName={shareMatch.clubName || 'Club'}
          onClose={() => setShareMatch(null)}
        />
      ) : null}
    </Page>
  )
}

function AchievementBadge({
  unlocked,
  title,
  description,
  icon,
  glowClass,
  lockedClass,
}: {
  unlocked: boolean
  title: string
  description: string
  icon: string
  glowClass: string
  lockedClass: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-xl border text-center space-y-1 transition duration-305 shadow-sm",
        unlocked ? glowClass : lockedClass,
        unlocked && "hover:-translate-y-1 hover:shadow-md"
      )}
    >
      <span className={cn("text-2xl", !unlocked && "grayscale filter")}>{icon}</span>
      <span className="text-xs font-bold">{title}</span>
      <span className="text-[9px] leading-tight text-[var(--arena-text-dim)]">{description}</span>
    </div>
  )
}
