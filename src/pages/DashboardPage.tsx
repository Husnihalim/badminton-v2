import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Page } from '../components/ui/page'
import ScorecardShareModal from '../components/ScorecardShareModal'
import RivalryShareModal from '../components/RivalryShareModal'
import { generateStoryMoments } from '../lib/storyMoments'

// Hooks
import {
  usePlayerDashboard,
  useDiscoverClubs,
  useClubsMatches,
  useClubsMembers,
} from '../features/dashboard/hooks/useDashboardQueries'

// Components
import DashboardHeader from '../features/dashboard/components/DashboardHeader'
import PlayerPerformanceStats from '../features/dashboard/components/PlayerPerformanceStats'
import SportsStoryFeed from '../features/dashboard/components/SportsStoryFeed'
import DashboardAchievements from '../features/dashboard/components/DashboardAchievements'
import RivalryTool from '../features/dashboard/components/RivalryTool'
import JoinedClubsList from '../features/dashboard/components/JoinedClubsList'
import ClubDiscoveryPanel from '../features/dashboard/components/ClubDiscoveryPanel'
import DashboardUpcomingGameDays from '../features/dashboard/components/DashboardUpcomingGameDays'
import DashboardRecentMatches from '../features/dashboard/components/DashboardRecentMatches'

import type { Club, MatchWithDetails, MatchParticipant, ScoreSet } from '../types'

type DashboardClub = Club & { role?: string; elo_rating?: number | null; rank?: { rank: number; total: number } | null }
type DashboardMatch = MatchWithDetails & { clubName?: string }

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [shareMatch, setShareMatch] = useState<DashboardMatch | null>(null)
  const [selectedRival, setSelectedRival] = useState<string>('')
  const [shareRivalMatch, setShareRivalMatch] = useState<{
    rivalName: string
    wins: number
    losses: number
    matchesPlayed: number
    mode: 'rival' | 'partner'
  } | null>(null)

  // React Query Queries
  const { data: dashboardData, isLoading: dashboardLoading } = usePlayerDashboard(user?.id)
  const { data: allClubs = [] } = useDiscoverClubs(!!user)

  // Extract club list from dashboard data
  const clubs: DashboardClub[] = useMemo(() => dashboardData?.clubs || [], [dashboardData])
  const clubIds = useMemo(() => clubs.map((c: DashboardClub) => c.id), [clubs])

  // Fetch all matches and members for joined clubs in parallel
  const matchesQueries = useClubsMatches(clubIds)
  const membersQueries = useClubsMembers(clubIds)

  // Aggregate user matches across all joined clubs
  const allUserMatches = useMemo(() => {
    if (!user) return []
    const allMatches: DashboardMatch[] = []
    matchesQueries.forEach((q, idx) => {
      if (q.data) {
        const clubName = clubs[idx]?.name
        q.data.forEach((m) => {
          allMatches.push({ ...m, clubName })
        })
      }
    })

    const filtered = allMatches.filter((m) =>
      m.participants.some((p) => p.user_id === user.id)
    )

    return filtered.sort(
      (a, b) =>
        new Date(b.match_date || b.created_at).getTime() -
        new Date(a.match_date || a.created_at).getTime()
    )
  }, [matchesQueries, clubs, user])

  // Aggregate and filter unique members for head-to-head comparison
  const clubMembers = useMemo(() => {
    if (!user) return []
    const rivalsSet = new Set<string>()
    const rivalsList: { id?: string; name: string }[] = []

    membersQueries.forEach((q) => {
      if (q.data) {
        q.data.forEach((m) => {
          const mName = m.name || 'Unknown'
          const normalizedName = mName.trim().toLowerCase()
          if (
            m.user_id !== user.id &&
            normalizedName !== user.name.toLowerCase() &&
            (!user.display_name || normalizedName !== user.display_name.toLowerCase()) &&
            !rivalsSet.has(normalizedName)
          ) {
            rivalsSet.add(normalizedName)
            rivalsList.push({ id: m.user_id, name: mName })
          }
        })
      }
    })

    return rivalsList.sort((a, b) => a.name.localeCompare(b.name))
  }, [membersQueries, user])

  // Generate stories dynamically based on user matches
  const storyMoments = useMemo(() => {
    if (!user) return []
    return generateStoryMoments({
      user,
      matches: allUserMatches,
      limit: 4,
    })
  }, [allUserMatches, user])

  // Filter out discoverable clubs
  const discoverableClubs = useMemo(() => {
    const joinedClubIds = new Set(clubs.map((c: DashboardClub) => c.id))
    return allClubs.filter((c: Club) => !joinedClubIds.has(c.id))
  }, [allClubs, clubs])

  // Deep-linking effect for ?rival=Name
  useEffect(() => {
    const rivalParam = searchParams.get('rival')
    if (rivalParam && clubMembers.length > 0) {
      const matched = clubMembers.find(
        (m) => m.name.toLowerCase() === rivalParam.toLowerCase()
      )
      if (matched) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedRival(matched.name)
        setTimeout(() => {
          const el = document.getElementById('rival-select')
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, clubMembers, setSearchParams])

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
  const primaryElo = primaryClub ? primaryClub.elo_rating : null
  const totalMatchesCount = dashboardData?.stats?.matchesPlayed || 0
  const upcomingEventsCount = dashboardData?.upcoming_events?.length || 0

  return (
    <Page>
      <DashboardHeader
        user={user}
        playerCardStats={playerCardStats}
        primaryClub={primaryClub}
        primaryRank={primaryRank}
        primaryElo={primaryElo}
      />

      <PlayerPerformanceStats
        clubCount={clubs.length}
        upcomingEvents={upcomingEventsCount}
        totalMatches={totalMatchesCount}
        personalStats={
          dashboardData?.stats || {
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            streak: 0,
            streakType: null,
          }
        }
      />

      <SportsStoryFeed storyMoments={storyMoments} />

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

      <RivalryTool
        user={user}
        clubMembers={clubMembers}
        allUserMatches={allUserMatches}
        selectedRival={selectedRival}
        onSelectedRivalChange={setSelectedRival}
        onShareRivalry={setShareRivalMatch}
      />

      <JoinedClubsList clubs={clubs} />

      <ClubDiscoveryPanel discoverableClubs={discoverableClubs} />

      <DashboardUpcomingGameDays events={dashboardData?.upcoming_events || []} />

      <DashboardRecentMatches
        matches={dashboardData?.recent_matches || []}
        onShareMatch={setShareMatch}
      />

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
    </Page>
  )
}
