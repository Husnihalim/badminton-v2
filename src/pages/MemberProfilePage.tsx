import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, Shield, Trophy, ChevronLeft, Users, User as UserIcon, Share2, Edit3 } from 'lucide-react'
import { getProfile, getPlayerDashboard } from '../lib/api/profiles'
import { getPlayerMatches } from '../lib/api/matches'
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
import { getPrimaryElo } from '../lib/playerCardData'
import { Badge } from '../components/ui/badge'
import { EloProgressionChart } from '../components/EloProgressionChart'

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
  const [clubs, setClubs] = useState<(Club & {
    singles_elo?: number | null
    doubles_elo?: number | null
    singles_games?: number | null
    doubles_games?: number | null
  })[]>([])
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

      // 2. Fetch User's Dashboard details (clubs, stats, achievements, ranks)
      const dashboard = await getPlayerDashboard(userId)

      const userProfileElo = {
        singles_elo: userProfile.singles_elo ?? 1200,
        doubles_elo: userProfile.doubles_elo ?? 1200,
        singles_games: userProfile.singles_games ?? 0,
        doubles_games: userProfile.doubles_games ?? 0,
      }

      const userClubs = (dashboard.clubs || []).map((c) => ({
        ...c,
        singles_elo: userProfileElo.singles_elo,
        doubles_elo: userProfileElo.doubles_elo,
        singles_games: userProfileElo.singles_games,
        doubles_games: userProfileElo.doubles_games,
      }))
      setClubs(userClubs)

      // Ranks mapping
      const ranks: Record<string, { rank: number; total: number }> = {}
      dashboard.clubs.forEach((c) => {
        if (c.rank) {
          ranks[c.id] = { rank: c.rank.rank, total: c.rank.total }
        }
      })
      setClubRanks(ranks)

      // 3. Fetch Matches if profile is public
      if (!userProfile.is_private || currentUser?.id === userId) {
        // Fetch Elo History from global table
        const { data: eloData, error: eloError } = await supabase
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

        if (eloError) {
          console.error('Error fetching Elo history:', eloError)
        } else {
          setEloHistory((eloData || []) as unknown as MemberEloHistoryRow[])
        }

        // Fetch user matches directly using optimized RPC
        const userMatches = await getPlayerMatches(userId, 50)
        setMatches(userMatches.slice(0, 10))
        setAllUserMatches(userMatches)

        // Build profiles mapping dynamically from participants of user's matches
        const profilesMap: Record<string, { userId: string; avatarUrl: string | null }> = {}
        userMatches.forEach((m) => {
          m.participants?.forEach((p) => {
            const pName = p.name || p.guest_name || 'Guest'
            if (p.user_id) {
              profilesMap[pName.toLowerCase()] = {
                userId: p.user_id,
                avatarUrl: p.profile?.avatar_url || null,
              }
            }
          })
        })
        setMemberProfilesMap(profilesMap)

        // Set stats directly from dashboard
        setPersonalStats({
          matchesPlayed: dashboard.stats?.matchesPlayed || 0,
          wins: dashboard.stats?.wins || 0,
          losses: dashboard.stats?.losses || 0,
          winRate: dashboard.stats?.winRate || 0,
          streak: dashboard.stats?.streak || 0,
          streakType: dashboard.stats?.streakType || null,
        })

        // Set achievements directly from dashboard
        setAchievements({
          onFire: dashboard.achievements?.onFire || false,
          giantSlayer: dashboard.achievements?.giantSlayer || false,
          cleanSweep: dashboard.achievements?.cleanSweep || false,
          ironMan: dashboard.achievements?.ironMan || false,
          dynamicDuo: dashboard.achievements?.dynamicDuo || false,
        })
      }
    } catch (err) {
      console.error('Error loading profile data:', err)
      setError('Failed to load profile details.')
    } finally {
      setLoading(false)
    }
  }, [userId, currentUser])

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
          <p className="text-sm text-danger font-semibold">{error || 'An error occurred.'}</p>
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-[var(--arena-text-muted)] hover:text-[var(--arena-text)] pl-0">
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
            elo={getPrimaryElo(primaryClub)}
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
                  <Trophy size={16} className="text-warning shrink-0" />
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
                  glowClass="shadow-warning/10 border-warning/20 bg-warning-soft text-warning"
                  lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.giantSlayer}
                  title="Giant Slayer"
                  description="Beat a higher ELO player"
                  icon="🛡️"
                  glowClass="shadow-info/10 border-info/20 bg-info-soft text-info"
                  lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.cleanSweep}
                  title="Clean Sweep"
                  description="Win set by 10+ pts"
                  icon="🎯"
                  glowClass="shadow-success/10 border-success-soft bg-success-soft text-success"
                  lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.ironMan}
                  title="Iron Man"
                  description="Play 3+ matches in 1 day"
                  icon="🚀"
                  glowClass="shadow-danger/10 border-danger/20 bg-danger-soft text-danger"
                  lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
                <AchievementBadge
                  unlocked={achievements.dynamicDuo}
                  title="Dynamic Duo"
                  description="3+ doubles wins streak"
                  icon="🤝"
                  glowClass="shadow-warning/10 border-warning/20 bg-warning-soft text-warning"
                  lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
                />
              </div>
            </section>
          )}

          {!showFullProfile && (
            <div className="rounded-xl border border-dashed border-[var(--arena-border)] p-8 text-center bg-[var(--arena-surface-muted)] mt-4 space-y-3">
              <Shield size={36} className="text-[var(--arena-text-dim)] mx-auto" />
              <h2 className="text-base font-bold text-[var(--arena-text)]">Stats are private</h2>
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
                <div className="space-y-4">
                  <EloProgressionChart history={eloHistory} />
                  
                  <section className="space-y-4 rounded-xl border border-[var(--arena-border)] bg-surface p-4 shadow-sm sm:p-5">
                    <div>
                      <h2 className="text-sm font-bold text-[var(--arena-text)] flex items-center gap-2">
                        <Activity size={16} className="text-[var(--arena-accent)] shrink-0" />
                        Elo Rating Progression
                      </h2>
                      <p className="text-[11px] text-[var(--arena-text-dim)] mt-0.5">Recent rating changes from club matches.</p>
                    </div>

                  <div className="divide-y divide-[var(--arena-border)] max-h-60 overflow-y-auto pr-1">
                    {eloHistory.map((item) => {
                      const ratingDiff = item.delta
                      const isGain = ratingDiff >= 0
                      const matchTitle = item.matches?.title || 'Match'
                      const dateStr = new Date(item.matches?.match_date || item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      const matchTypeLabel = item.match_type === 'doubles' ? 'Doubles' : 'Singles'
                      
                      return (
                        <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-[var(--arena-text)] truncate block">
                              {matchTitle}
                            </span>
                            <span className="text-[10px] text-[var(--arena-text-dim)] font-semibold block">
                              {matchTypeLabel} · {dateStr}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono text-[var(--arena-text-dim)]">
                              {item.elo_before} → <span className="font-extrabold text-[var(--arena-text)]">{item.elo_after}</span>
                            </span>
                            <span className={cn(
                              "inline-flex items-center justify-center font-extrabold px-1.5 py-0.5 rounded text-[10px] w-12 text-center",
                              isGain 
                                ? "bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-[var(--arena-accent)]/20" 
                                : "bg-danger-soft text-danger border border-danger/20"
                            )}>
                              {isGain ? `+${ratingDiff}` : ratingDiff}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  </section>
                </div>
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
              <h2 className="text-base font-bold text-[var(--arena-text)]">Match log is private</h2>
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
                      <h3 className="font-bold text-sm text-[var(--arena-text)]">{club.name}</h3>
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
