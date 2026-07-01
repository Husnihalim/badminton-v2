import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Page, PageHeader } from '../components/ui/page'
import ScorecardShareModal from '../components/ScorecardShareModal'
import RivalryShareModal from '../components/RivalryShareModal'
import { OnboardingTour } from '../components/OnboardingTour'
import { useOnboarding } from '../hooks/useOnboarding'
import { playerTourSteps } from '../lib/onboarding/steps'
import { generateStoryMoments } from '../lib/storyMoments'
import { calculatePlayerInsights, getSignatureMoment } from '../lib/insights'
import { getPrimaryElo } from '../lib/playerCardData'
import { getPendingRosterInvites, respondToRosterInvite } from '../lib/api/competitions'
import type { RosterInvite } from '../types/competition'


// Hooks
import {
  usePlayerDashboard,
  useDiscoverClubs,
  usePlayerMatches,
} from '../features/dashboard/hooks/useDashboardQueries'

// Components
import { PlayerCard } from '../components/PlayerCard'
import SportsStoryFeed from '../features/dashboard/components/SportsStoryFeed'
import DashboardAchievements from '../features/dashboard/components/DashboardAchievements'
import JoinedClubsList from '../features/dashboard/components/JoinedClubsList'
import ClubDiscoveryPanel from '../features/dashboard/components/ClubDiscoveryPanel'
import DashboardUpcomingGameDays from '../features/dashboard/components/DashboardUpcomingGameDays'
import DashboardRecentMatches from '../features/dashboard/components/DashboardRecentMatches'

// Icons
import { User as UserIcon, Activity, Users, Edit3, Share2, Zap } from 'lucide-react'

import type { Club, MatchWithDetails, MatchParticipant, ScoreSet } from '../types'

type DashboardClub = Club & {
  role?: string
  singles_elo?: number | null
  doubles_elo?: number | null
  singles_games?: number | null
  doubles_games?: number | null
  rank?: { rank: number; total: number } | null
}
type DashboardMatch = MatchWithDetails & { clubName?: string }

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { fetchNotifications } = useNotifications()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [shareMatch, setShareMatch] = useState<DashboardMatch | null>(null)
  const [shareRivalMatch, setShareRivalMatch] = useState<{
    rivalName: string
    wins: number
    losses: number
    matchesPlayed: number
    mode: 'rival' | 'partner'
  } | null>(null)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [pendingInvites, setPendingInvites] = useState<RosterInvite[]>([])

  useEffect(() => {
    if (!user) return
    const userId = user.id
    async function loadInvites() {
      const { invites, error } = await getPendingRosterInvites(userId)
      if (!error && invites) {
        setPendingInvites(invites)
      }
    }
    loadInvites()
  }, [user])

  const handleRespondToInvite = async (inviteId: string, accept: boolean) => {
    if (!user) return
    const { error } = await respondToRosterInvite(inviteId, user.id, accept)
    if (!error) {
      setToastMessage(accept ? 'Invitation accepted!' : 'Invitation declined')
      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId))
      await fetchNotifications()
      setTimeout(() => setToastMessage(''), 2000)
    } else {
      setToastMessage('Failed to update invitation status')
      setTimeout(() => setToastMessage(''), 2000)
    }
  }


  // React Query Queries
  const { data: dashboardData, isLoading: dashboardLoading } = usePlayerDashboard(user?.id)
  const { data: allClubs = [] } = useDiscoverClubs(!!user)
  const { data: playerMatches = [] } = usePlayerMatches(user?.id)
  const { isVisible, skip, complete } = useOnboarding({
    user,
    tourId: 'player-dashboard',
    autoShow: true,
    enabled: !authLoading && !dashboardLoading,
  })

  // Extract club list from dashboard data
  const clubs: DashboardClub[] = useMemo(() => dashboardData?.clubs || [], [dashboardData])

  // Aggregate user matches across all joined clubs
  const allUserMatches = useMemo(() => {
    if (!user) return []
    const clubsMap = new Map(clubs.map((c: DashboardClub) => [c.id, c.name]))
    return (playerMatches as DashboardMatch[]).map((m) => ({
      ...m,
      clubName: clubsMap.get(m.club_id) || 'Unknown Club'
    })).sort(
      (a, b) =>
        new Date(b.match_date || b.created_at).getTime() -
        new Date(a.match_date || a.created_at).getTime()
    )
  }, [playerMatches, clubs, user])

  // Build the profiles mapping for calculating user details and avatars
  const memberProfilesMap = useMemo(() => {
    const profilesMap: Record<string, { userId: string; avatarUrl: string | null }> = {}
    playerMatches.forEach((m) => {
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
    return profilesMap
  }, [playerMatches])

  // Calculate top partner, top rival and ELO insights client-side
  const playerInsights = useMemo(() => {
    if (!user) return null
    return calculatePlayerInsights(
      allUserMatches,
      user.id,
      user.name,
      user.display_name,
      memberProfilesMap
    )
  }, [allUserMatches, user, memberProfilesMap])

  // Extract signature moment dynamically from match history
  const signatureMoment = useMemo(() => {
    if (!user) return null
    return getSignatureMoment(allUserMatches, user.id)
  }, [allUserMatches, user])

  // Filter out discoverable clubs
  const discoverableClubs = useMemo(() => {
    const joinedClubIds = new Set(clubs.map((c: DashboardClub) => c.id))
    return allClubs.filter((c: Club) => !joinedClubIds.has(c.id))
  }, [allClubs, clubs])

  // Tab State syncing with search params
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'clubs'>(() => {
    const tabParam = searchParams.get('tab')
    if (['overview', 'matches', 'clubs'].includes(tabParam || '')) {
      return tabParam as 'overview' | 'matches' | 'clubs'
    }
    return 'overview'
  })

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview', 'matches', 'clubs'].includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam as 'overview' | 'matches' | 'clubs')
    }
  }, [searchParams])

  // Player Card Stats formatting
  const playerCardStats = useMemo(() => {
    if (!user) return undefined
    const recentMatches = dashboardData?.recent_matches || []
    const form = recentMatches.slice(0, 5).map((m: DashboardMatch) => {
      const userPart = m.participants?.find((p: MatchParticipant) => p.user_id === user.id)
      if (!userPart || !m.score_sets?.length) return { won: false, setScores: 'Unknown' }
      const t1Sets = m.score_sets.filter((s: ScoreSet) => s.team1_score > s.team2_score).length
      const t2Sets = m.score_sets.filter((s: ScoreSet) => s.team2_score > s.team1_score).length
      const won =
        (t1Sets > t2Sets && userPart.team === 1) || (t2Sets > t1Sets && userPart.team === 2)
      const scoreText = m.score_sets
        .map((s: ScoreSet) => `${s.team1_score}-${s.team2_score}`)
        .join(', ')
      return { won, setScores: scoreText }
    })
    const stats = dashboardData?.stats || {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      streak: 0,
      streakType: null,
    }
    return {
      matchesPlayed: stats.matchesPlayed,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
      streak: stats.streak,
      streakType: stats.streakType,
      form,
    }
  }, [dashboardData, user])

  // Generate stories dynamically based on user matches
  const storyMoments = useMemo(() => {
    if (!user) return []
    return generateStoryMoments({
      user,
      matches: allUserMatches,
      limit: 4,
    })
  }, [allUserMatches, user])

  // Profile completeness calculation for the banner
  const profileCompleteness = useMemo(() => {
    if (!user) return 0
    let score = 0
    if (user.bio?.trim()) score += 20
    const hasSocial = user.social_links && Object.values(user.social_links).some(v => typeof v === 'string' && v.trim() !== '')
    if (hasSocial) score += 20
    if (user.gear?.racket?.trim()) score += 20
    if (user.gear?.play_style) score += 20
    if (user.city?.trim()) score += 20
    return score
  }, [user])

  const missingFields = useMemo(() => {
    if (!user) return []
    const missing = []
    if (!user.bio?.trim()) missing.push('Bio')
    const hasSocial = user.social_links && Object.values(user.social_links).some(v => typeof v === 'string' && v.trim() !== '')
    if (!hasSocial) missing.push('Social Links')
    if (!user.gear?.racket?.trim()) missing.push('Racket Name')
    if (!user.gear?.play_style) missing.push('Play Style')
    if (!user.city?.trim()) missing.push('City')
    return missing
  }, [user])

  const handleShare = () => {
    if (!user) return
    const shareUrl = `${window.location.origin}/member/${user.id}`
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setToastMessage('Link copied to clipboard!')
        setTimeout(() => setToastMessage(''), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy link:', err)
      })
  }

  if (authLoading || (user && dashboardLoading)) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">
          Loading...
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="mx-auto mt-6 max-w-md">
        <CardContent className="space-y-4 pt-5 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--arena-text)]">
              Welcome to kelabsukan.com
            </h1>
            <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
              Log in to view your dashboard, clubs, events, and match scores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => navigate('/login')}>Log in</Button>
            <Button variant="secondary" onClick={() => navigate('/register')}>
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const primaryClub = clubs[0]
  const primaryRank = primaryClub ? primaryClub.rank : null
  const primaryElo = getPrimaryElo(primaryClub)
  const displayName = user.display_name || user.name
  const firstName = displayName.split(' ')[0] || displayName

  return (
    <Page>
      {/* Toast feedback */}
      {toastMessage && (
        <div className="modal-toast animate-fade-in z-50">
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        data-tour-id="dashboard-header"
        eyebrow="Personal home"
        title={`Welcome back, ${firstName}`}
        description="Your profile, player card, stats, stories, clubs, and next actions in one place."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => navigate('/profile')}
              className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg"
              title="Edit Card"
              data-tour-id="edit-profile-button"
            >
              <Edit3 size={14} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg"
              title="Share Link"
            >
              <Share2 size={14} aria-hidden="true" />
            </Button>
          </>
        }
      />

      {/* completeness banner */}
      {!isBannerDismissed && profileCompleteness < 100 && (
        <div className="mb-4 rounded-xl border border-[var(--arena-accent)]/20 bg-[var(--arena-surface-elevated)]/30 p-4 backdrop-blur-sm" data-tour-id="profile-completeness-banner">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--arena-text)] flex items-center gap-1.5">
                <Zap size={14} className="text-[var(--arena-accent)] fill-[var(--arena-accent)]" aria-hidden="true" />
                <span className="text-[var(--arena-accent)]">Complete Your Player Card</span>
                <span className="rounded bg-[var(--arena-accent-soft)] px-1.5 py-0.5 text-[10px] font-black uppercase text-[var(--arena-accent)] border border-[var(--arena-accent)]/20">
                  {profileCompleteness}% Complete
                </span>
              </h3>
              <p className="text-xs text-[var(--arena-text-muted)]">
                Completing your player card makes it public and lets other members search for your play style, hand preferences, and racket specs.
              </p>
              {missingFields.length > 0 && (
                <p className="text-[11px] font-semibold text-[var(--arena-text-dim)]">
                  Remaining: {missingFields.join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs cursor-pointer border-[var(--arena-accent)]/25 text-[var(--arena-accent)] hover:bg-[var(--arena-accent-soft)]"
                onClick={() => navigate('/profile')}
              >
                Setup Now
              </Button>
              <button
                type="button"
                onClick={() => setIsBannerDismissed(true)}
                className="text-xs text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] px-2 py-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--arena-surface-muted)] overflow-hidden border border-[var(--arena-border)]">
            <div
              className="h-full bg-[var(--arena-accent)] transition-all duration-500 shadow-[0_0_8px_rgba(204,255,0,0.4)]"
              style={{ width: `${profileCompleteness}%` }}
            />
          </div>
        </div>
      )}

      {/* Roster Invites Banner */}
      {pendingInvites.map((invite) => {
        const invitingClubName = invite.competition?.club?.name || 'Admin'
        return (
          <div key={invite.id} className="mb-4 rounded-xl border border-[var(--arena-blue)]/20 bg-[var(--arena-surface-elevated)]/30 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--arena-text)] flex items-center gap-1.5">
                  <span className="text-[var(--arena-blue)]">🏸 Roster Invitation</span>
                  <span className="rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-black uppercase text-info border border-info/20">
                    Pending
                  </span>
                </h3>
                <p className="text-xs text-[var(--arena-text-muted)]">
                  <strong>{invitingClubName}</strong> invited you to play in their roster for <strong>"{invite.competition?.title}"</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs cursor-pointer bg-[var(--arena-lime)] text-black font-bold border-none"
                  onClick={() => handleRespondToInvite(invite.id, true)}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs cursor-pointer border-danger/25 text-danger hover:bg-danger-soft"
                  onClick={() => handleRespondToInvite(invite.id, false)}
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        )
      })}


      {/* Tab Navigation */}
      <div className="border-b border-[var(--arena-border)] flex gap-1 overflow-x-auto whitespace-nowrap">
        {([
          { id: 'overview', label: 'Player Card', icon: UserIcon },
          { id: 'matches', label: 'Matches', icon: Activity },
          { id: 'clubs', label: 'Clubs', icon: Users }
        ] as const).map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              data-tour-id={`tab-${tab.id}`}
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
          {/* Core Player Card Component Redesigned */}
          <PlayerCard
            profile={user}
            stats={playerCardStats}
            rank={primaryRank}
            elo={primaryElo}
            isOwner={true}
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

          {/* Achievements */}
          <DashboardAchievements
            achievements={
              dashboardData?.achievements || {
                onFire: false,
                giantSlayer: false,
                cleanSweep: false,
                ironMan: false,
                dynamicDuo: false,
              }
            }
          />

          {/* Sports Stories Feed */}
          <SportsStoryFeed storyMoments={storyMoments} />
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-6">
          <DashboardUpcomingGameDays events={dashboardData?.upcoming_events || []} />
          
          <DashboardRecentMatches
            matches={dashboardData?.recent_matches || []}
            onShareMatch={setShareMatch}
          />
        </div>
      )}

      {activeTab === 'clubs' && (
        <div className="space-y-6">
          <JoinedClubsList clubs={clubs} />
          
          <ClubDiscoveryPanel discoverableClubs={discoverableClubs} />
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

      {shareRivalMatch ? (
        <RivalryShareModal
          rivalName={shareRivalMatch.rivalName}
          wins={shareRivalMatch.wins}
          losses={shareRivalMatch.losses}
          matchesPlayed={shareRivalMatch.matchesPlayed}
          userName={user.display_name || user.name}
          mode={shareRivalMatch.mode}
          onClose={() => setShareRivalMatch(null)}
        />
      ) : null}

      <OnboardingTour
        steps={playerTourSteps}
        isOpen={isVisible}
        onComplete={complete}
        onSkip={skip}
      />
    </Page>
  )
}
