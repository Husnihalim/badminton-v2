import { useCallback, useEffect, useState, useMemo, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, Club as ClubIcon, Copy, MessageCircle, Share2, ShieldCheck, Trophy, Users, Flame, Percent, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { buildEventShareText, buildEventShareUrl, getMyClubs, getClubEvents, getClubMatches, getEventRsvps, getMyEventRsvps, rsvpToEvent, getClubLeaderboard, getClubMembers } from '../lib/api'
import type { Club, ClubEvent, EventRsvp, MatchWithDetails } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'
import ScorecardShareModal from '../components/ScorecardShareModal'
import RivalryShareModal from '../components/RivalryShareModal'
import { cn } from '../lib/utils'
import { MatchScoreboard } from '../components/MatchScoreboard'

type DashboardClub = Club & { role?: string }
type DashboardEvent = ClubEvent & { clubName?: string }
type DashboardMatch = MatchWithDetails & { clubName?: string }

function formatEventCost(event: DashboardEvent) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount = event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

function getRsvpLabel(status: EventRsvp['status']) {
  if (status === 'going') return 'Accepted'
  if (status === 'maybe') return 'Holding'
  return 'Rejected'
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { showToast } = useNotifications()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [clubs, setClubs] = useState<DashboardClub[]>([])
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [matches, setMatches] = useState<DashboardMatch[]>([])
  const [myRsvps, setMyRsvps] = useState<EventRsvp[]>([])
  const [eventRsvpsByEvent, setEventRsvpsByEvent] = useState<Record<string, EventRsvp[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [shareMatch, setShareMatch] = useState<DashboardMatch | null>(null)
  
  const [personalStats, setPersonalStats] = useState<{
    matchesPlayed: number
    wins: number
    losses: number
    winRate: number
    streak: number
    streakType: 'win' | 'loss' | null
  }>({ matchesPlayed: 0, wins: 0, losses: 0, winRate: 0, streak: 0, streakType: null })
  const [clubRanks, setClubRanks] = useState<Record<string, { rank: number; total: number }>>({})
  const [allUserMatches, setAllUserMatches] = useState<DashboardMatch[]>([])
  const [achievements, setAchievements] = useState<{
    onFire: boolean
    giantSlayer: boolean
    cleanSweep: boolean
    ironMan: boolean
    dynamicDuo: boolean
  }>({ onFire: false, giantSlayer: false, cleanSweep: false, ironMan: false, dynamicDuo: false })
  const [clubMembers, setClubMembers] = useState<{ id?: string; name: string }[]>([])
  const [selectedRival, setSelectedRival] = useState<string>('')
  const [comparisonMode, setComparisonMode] = useState<'rival' | 'partner'>('partner')
  const [shareRivalMatch, setShareRivalMatch] = useState<{ rivalName: string; wins: number; losses: number; matchesPlayed: number; mode: 'rival' | 'partner' } | null>(null)

  const rivalryStats = useMemo(() => {
    if (!selectedRival || !user) return null

    const targetMatches = allUserMatches.filter((m) => {
      const userPart = m.participants.find((p) => p.user_id === user.id)
      if (!userPart) return false

      const otherPart = m.participants.find(
        (p) => (p.user_id && p.user_id === selectedRival) || 
               (p.name && p.name.toLowerCase() === selectedRival.toLowerCase()) ||
               (p.guest_name && p.guest_name.toLowerCase() === selectedRival.toLowerCase())
      )
      if (!otherPart) return false

      if (comparisonMode === 'rival') {
        return userPart.team !== otherPart.team
      } else {
        return m.match_type === 'doubles' && userPart.team === otherPart.team
      }
    })

    targetMatches.sort((a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime())

    let wins = 0
    let losses = 0
    const form: ('W' | 'L')[] = []
    let activeStreak = 0
    let streakType: 'win' | 'loss' | null = null
    let isStreakBroken = false

    targetMatches.forEach((m, idx) => {
      const userPart = m.participants.find((p) => p.user_id === user.id)
      if (!userPart) return

      const scoreSets = m.score_sets || []
      if (scoreSets.length === 0) return

      const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
      const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
      if (team1Sets === team2Sets) return

      const winningTeam = team1Sets > team2Sets ? 1 : 2
      const isWin = userPart.team === winningTeam

      if (isWin) {
        wins++
        if (idx < 5) form.push('W')
      } else {
        losses++
        if (idx < 5) form.push('L')
      }

      if (!isStreakBroken) {
        if (streakType === null) {
          streakType = isWin ? 'win' : 'loss'
          activeStreak = 1
        } else if (streakType === 'win' && isWin) {
          activeStreak++
        } else if (streakType === 'loss' && !isWin) {
          activeStreak++
        } else {
          isStreakBroken = true
        }
      }
    })

    return {
      matchesPlayed: targetMatches.length,
      wins,
      losses,
      winRate: targetMatches.length > 0 ? Math.round((wins / targetMatches.length) * 100) : 0,
      form: form.reverse(),
      streak: streakType === null ? 0 : activeStreak,
      streakType,
    }
  }, [selectedRival, allUserMatches, user, comparisonMode])

  const recommendedInsights = useMemo(() => {
    if (!user || allUserMatches.length === 0) return null

    const partners = new Map<string, { wins: number; matches: number }>()
    const rivals = new Map<string, { wins: number; matches: number }>()
    const opponentPairs = new Map<string, { wins: number; losses: number; matches: number }>()

    allUserMatches.forEach((m) => {
      const userPart = m.participants.find((p) => p.user_id === user.id)
      if (!userPart) return

      const scoreSets = m.score_sets || []
      if (scoreSets.length === 0) return

      const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
      const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
      if (team1Sets === team2Sets) return

      const winningTeam = team1Sets > team2Sets ? 1 : 2
      const isWin = userPart.team === winningTeam

      m.participants.forEach((p) => {
        const pName = p.name || p.guest_name
        if (!pName) return

        // Exclude the user themselves from being recommended as teammate/rival
        if (p.user_id === user.id) return
        if (pName.toLowerCase() === user.name.toLowerCase()) return
        if (user.display_name && pName.toLowerCase() === user.display_name.toLowerCase()) return

        if (userPart.team === p.team) {
          // Teammate (Partner) in doubles
          if (m.match_type === 'doubles') {
            const stats = partners.get(pName) ?? { wins: 0, matches: 0 }
            stats.matches++
            if (isWin) stats.wins++
            partners.set(pName, stats)
          }
        } else {
          // Opponent (Rival)
          const stats = rivals.get(pName) ?? { wins: 0, matches: 0 }
          stats.matches++
          if (isWin) stats.wins++ // User won against this opponent
          rivals.set(pName, stats)
        }
      })

      // Calculate opponent pairs in doubles matches
      if (m.match_type === 'doubles') {
        const oppNames = m.participants
          .filter((p) => p.team !== userPart.team)
          .map((p) => p.name || p.guest_name)
          .filter(Boolean) as string[]

        if (oppNames.length === 2) {
          oppNames.sort()
          const pairKey = oppNames.join(' & ')
          const stats = opponentPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
          stats.matches++
          if (isWin) {
            stats.wins++
          } else {
            stats.losses++
          }
          opponentPairs.set(pairKey, stats)
        }
      }
    })

    // Find best partner: highest win rate (min 2 matches if possible, otherwise 1)
    const partnersList = Array.from(partners.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      winRate: (stats.wins / stats.matches) * 100,
    }))

    let bestPartner = null
    const partnerCandidates = partnersList.filter((p) => p.matches >= 2)
    const targetPartners = partnerCandidates.length > 0 ? partnerCandidates : partnersList
    if (targetPartners.length > 0) {
      bestPartner = [...targetPartners].sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches)[0]
    }

    // Find biggest rival: most matches played against
    const rivalsList = Array.from(rivals.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      winRate: (stats.wins / stats.matches) * 100,
    }))

    let topRival = null
    const rivalCandidates = rivalsList.filter((r) => r.matches >= 2)
    const targetRivals = rivalCandidates.length > 0 ? rivalCandidates : rivalsList
    if (targetRivals.length > 0) {
      topRival = [...targetRivals].sort((a, b) => b.matches - a.matches || Math.abs(50 - a.winRate) - Math.abs(50 - b.winRate))[0]
    }

    // Find nemesis (worst opponent): lowest win rate and must have at least 1 loss
    let nemesis = null
    const nemesisList = rivalsList.filter((r) => r.matches - r.wins > 0)
    if (nemesisList.length > 0) {
      const nemesisCandidates = nemesisList.filter((r) => r.matches >= 2)
      const targetNemesis = nemesisCandidates.length > 0 ? nemesisCandidates : nemesisList
      nemesis = [...targetNemesis].sort(
        (a, b) => a.winRate - b.winRate || b.matches - a.matches || (b.matches - b.wins) - (a.matches - a.wins)
      )[0]
    }

    // Find toughest opponent pairs (lost to them)
    const opponentPairsList = Array.from(opponentPairs.entries()).map(([names, stats]) => ({
      names,
      ...stats,
      winRate: (stats.wins / stats.matches) * 100,
    }))

    const worstOpponentPairs = opponentPairsList
      .filter((p) => p.losses > 0)
      .sort((a, b) => b.losses - a.losses || a.winRate - b.winRate || b.matches - a.matches)
      .slice(0, 3)

    return {
      bestPartner,
      topRival,
      nemesis,
      worstOpponentPairs,
      bestPartnersList: partnersList.filter(p => p.matches >= 1).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches).slice(0, 3),
      topRivalsList: rivalsList.filter(r => r.matches >= 1).sort((a, b) => b.matches - a.matches || a.winRate - b.winRate).slice(0, 3)
    }
  }, [allUserMatches, user])

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const myClubs = await getMyClubs()
      setClubs(myClubs)
      
      const allEvents: DashboardEvent[] = []
      const allMatches: DashboardMatch[] = []
      const clubResults = await Promise.allSettled(
        myClubs.map(async (club) => {
          const [clubEvents, clubMatches] = await Promise.all([
            getClubEvents(club.id),
            getClubMatches(club.id),
          ])

          return { club, clubEvents, clubMatches }
        })
      )

      clubResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { club, clubEvents, clubMatches } = result.value
          const now = Date.now()
          allEvents.push(
            ...clubEvents
              .filter((event) => new Date(event.event_date).getTime() >= now)
              .map((event) => ({ ...event, clubName: club.name }))
          )
          allMatches.push(...clubMatches.map(m => ({ ...m, clubName: club.name })))
        } else {
          console.error(`Error loading data for club ${myClubs[index]?.id}:`, result.reason)
        }
      })
      
      // Sort events by date (upcoming first)
      allEvents.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      
      // Sort matches by date (most recent first)
      allMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      const visibleEvents = allEvents.slice(0, 5)
      setEvents(visibleEvents)
      setMatches(allMatches.slice(0, 5))

      // Calculate personal stats from the full list of matches
      const userMatches = allMatches.filter((m) =>
        m.participants.some((p) => p.user_id === user.id)
      )

      // Sort user matches chronologically descending
      userMatches.sort((a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime())

      let personalWins = 0
      let personalLosses = 0
      let streakCount = 0
      let activeStreakType: 'win' | 'loss' | null = null
      let isStreakBroken = false

      for (let i = 0; i < userMatches.length; i++) {
        const m = userMatches[i]
        const userPart = m.participants.find((p) => p.user_id === user.id)
        if (!userPart) continue

        const scoreSets = m.score_sets || []
        if (scoreSets.length === 0) continue

        const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
        const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
        if (team1Sets === team2Sets) continue // skip draw

        const winningTeam = team1Sets > team2Sets ? 1 : 2
        const isWin = userPart.team === winningTeam

        if (isWin) {
          personalWins++
        } else {
          personalLosses++
        }

        // Calculate streak
        if (!isStreakBroken) {
          if (activeStreakType === null) {
            activeStreakType = isWin ? 'win' : 'loss'
            streakCount = 1
          } else if (activeStreakType === 'win' && isWin) {
            streakCount++
          } else if (activeStreakType === 'loss' && !isWin) {
            streakCount++
          } else {
            isStreakBroken = true
          }
        }
      }

      setPersonalStats({
        matchesPlayed: userMatches.length,
        wins: personalWins,
        losses: personalLosses,
        winRate: userMatches.length > 0 ? Math.round((personalWins / (personalWins + personalLosses || 1)) * 100) : 0,
        streak: activeStreakType === null ? 0 : streakCount,
        streakType: activeStreakType
      })

      // Fetch user's rank, leaderboards and members in each club
      const ranks: Record<string, { rank: number; total: number }> = {}
      const clubLeaderboards: Record<string, Record<string, number>> = {}
      const rivalsSet = new Set<string>()
      const rivalsList: { id?: string; name: string }[] = []

      for (const club of myClubs) {
        try {
          const lb = await getClubLeaderboard(club.id, 100)
          const index = lb.findIndex(
            (row) => row.name.toLowerCase() === user.name.toLowerCase() ||
                    (user.display_name && row.name.toLowerCase() === user.display_name.toLowerCase())
          )
          if (index !== -1) {
            ranks[club.id] = { rank: index + 1, total: lb.length }
          }
          
          const lbMap: Record<string, number> = {}
          lb.forEach((row, rIdx) => {
            lbMap[row.name.toLowerCase()] = rIdx + 1
          })
          clubLeaderboards[club.id] = lbMap

          const members = await getClubMembers(club.id)
          members.forEach((m) => {
            const mName = m.name || 'Unknown'
            if (m.user_id !== user.id &&
                mName.toLowerCase() !== user.name.toLowerCase() &&
                (!user.display_name || mName.toLowerCase() !== user.display_name.toLowerCase()) &&
                !rivalsSet.has(mName.toLowerCase())) {
              rivalsSet.add(mName.toLowerCase())
              rivalsList.push({ id: m.user_id, name: mName })
            }
          })
        } catch (e) {
          console.error(`Error fetching rank for club ${club.id}:`, e)
        }
      }
      setClubRanks(ranks)
      
      rivalsList.sort((a, b) => a.name.localeCompare(b.name))
      setClubMembers(rivalsList)
      setAllUserMatches(userMatches)

      // Calculate Achievements
      // 1. On Fire (🔥)
      const onFireStatus = activeStreakType === 'win' && streakCount >= 3

      // 2. Clean Sweep (🎯)
      let cleanSweepStatus = false
      for (const m of userMatches) {
        const userPart = m.participants.find((p) => p.user_id === user.id)
        if (!userPart) continue
        const scoreSets = m.score_sets || []
        for (const set of scoreSets) {
          const diff = userPart.team === 1 
            ? set.team1_score - set.team2_score 
            : set.team2_score - set.team1_score
          if (diff >= 10) {
            cleanSweepStatus = true
            break
          }
        }
        if (cleanSweepStatus) break
      }

      // 3. Iron Man (🚀)
      const matchesByDate: Record<string, number> = {}
      userMatches.forEach((m) => {
        const dateStr = new Date(m.match_date || m.created_at).toISOString().split('T')[0]
        matchesByDate[dateStr] = (matchesByDate[dateStr] || 0) + 1
      })
      const ironManStatus = Object.values(matchesByDate).some((count) => count >= 3)

      // 4. Dynamic Duo (🤝)
      const partnerStreaks: Record<string, number> = {}
      let dynamicDuoStatus = false
      const chronoMatches = [...userMatches].reverse()
      for (const m of chronoMatches) {
        const userPart = m.participants.find((p) => p.user_id === user.id)
        if (!userPart) continue
        if (m.match_type !== 'doubles') continue

        const partnerPart = m.participants.find((p) => p.team === userPart.team && p.user_id !== user.id)
        if (!partnerPart) continue
        const partnerKey = partnerPart.user_id || partnerPart.name || partnerPart.guest_name || 'partner'

        const scoreSets = m.score_sets || []
        if (scoreSets.length === 0) continue
        const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
        const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
        if (team1Sets === team2Sets) continue

        const winningTeam = team1Sets > team2Sets ? 1 : 2
        const isWin = userPart.team === winningTeam

        if (isWin) {
          partnerStreaks[partnerKey] = (partnerStreaks[partnerKey] || 0) + 1
          if (partnerStreaks[partnerKey] >= 3) {
            dynamicDuoStatus = true
          }
        } else {
          partnerStreaks[partnerKey] = 0
        }
      }

      // 5. Giant Slayer (🛡️)
      let giantSlayerStatus = false
      for (const m of userMatches) {
        const userPart = m.participants.find((p) => p.user_id === user.id)
        if (!userPart) continue
        const lbMap = clubLeaderboards[m.club_id]
        if (!lbMap) continue

        const userRank = lbMap[user.name.toLowerCase()] || (user.display_name && lbMap[user.display_name.toLowerCase()])
        if (!userRank) continue

        const scoreSets = m.score_sets || []
        if (scoreSets.length === 0) continue
        const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
        const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
        if (team1Sets === team2Sets) continue

        const winningTeam = team1Sets > team2Sets ? 1 : 2
        const isWin = userPart.team === winningTeam

        if (isWin) {
          const opponentTeam = userPart.team === 1 ? 2 : 1
          const opponents = m.participants.filter((p) => p.team === opponentTeam)
          for (const opp of opponents) {
            const oppName = opp.name || opp.guest_name || ''
            const oppRank = lbMap[oppName.toLowerCase()]
            if (oppRank && oppRank < userRank) {
              giantSlayerStatus = true
              break
            }
          }
        }
        if (giantSlayerStatus) break
      }

      setAchievements({
        onFire: onFireStatus,
        giantSlayer: giantSlayerStatus,
        cleanSweep: cleanSweepStatus,
        ironMan: ironManStatus,
        dynamicDuo: dynamicDuoStatus
      })

      const myEventRsvps = await getMyEventRsvps()
      setMyRsvps(myEventRsvps)

      const eventRsvpResults = await Promise.allSettled(
        visibleEvents.map((event) => getEventRsvps(event.id))
      )
      const eventRsvpMap: Record<string, EventRsvp[]> = {}
      eventRsvpResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          eventRsvpMap[visibleEvents[index].id] = result.value
        }
      })
      setEventRsvpsByEvent(eventRsvpMap)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast, user])

  const handleRsvp = async (eventId: string, status: EventRsvp['status']) => {
    try {
      await rsvpToEvent(eventId, status)
      showToast(`Session response updated: ${getRsvpLabel(status)}.`, 'success')

      const [updatedMyRsvps, updatedEventRsvps] = await Promise.all([
        getMyEventRsvps(),
        getEventRsvps(eventId),
      ])
      setMyRsvps(updatedMyRsvps)
      setEventRsvpsByEvent((prev) => ({
        ...prev,
        [eventId]: updatedEventRsvps,
      }))
    } catch (err) {
      console.error('Error updating dashboard RSVP:', err)
      showToast('Failed to update session response', 'error')
    }
  }

  const handleCopyEventShareLink = async (event: DashboardEvent) => {
    await navigator.clipboard.writeText(buildEventShareUrl(event.id))
    showToast('Game day link copied.', 'success')
  }

  const handleNativeEventShare = async (event: DashboardEvent) => {
    const shareUrl = buildEventShareUrl(event.id)
    const shareText = buildEventShareText(event)

    if (!navigator.share) {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Game day link copied.', 'success')
      return
    }

    await navigator.share({
      title: event.title,
      text: shareText,
      url: shareUrl,
    })
  }

  useEffect(() => {
    if (authLoading || !user) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData()
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false)
    }, 5000)
    
    return () => clearTimeout(timeout)
  }, [user, authLoading, loadDashboardData])

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

  if (authLoading || (user && isLoading)) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="mx-auto mt-6 max-w-md">
        <CardContent className="space-y-4 pt-5 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Welcome to kelabsukan.com</h1>
            <p className="text-sm leading-6 text-slate-600">
              Log in to view your dashboard, clubs, events, and match scores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => navigate('/login')}>
              Log in
            </Button>
            <Button variant="secondary" onClick={() => navigate('/register')}>
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate stats
  const totalMatches = matches.length
  const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date()).length
  const clubCount = clubs.length

  return (
    <Page>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Your next sessions, club actions, and recent updates in one place."
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={<Users size={17} />} label="Clubs" value={clubCount} />
        <StatCard icon={<CalendarDays size={17} />} label="Events" value={upcomingEvents} />
        <StatCard icon={<Trophy size={17} />} label="Matches" value={totalMatches} />
      </div>

      {/* Personal Player Performance Section */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
            <Activity size={18} className="text-emerald-700" />
            Your Performance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Calculated from all matches played across your clubs.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-500">Played</span>
            <p className="text-xl font-extrabold text-slate-950">{personalStats.matchesPlayed}</p>
            <span className="text-[10px] text-slate-400">Total Matches</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-500">Win / Loss</span>
            <p className="text-xl font-extrabold text-slate-950">
              <span className="text-emerald-700">{personalStats.wins}W</span>
              <span className="text-slate-400 mx-1">-</span>
              <span className="text-red-600">{personalStats.losses}L</span>
            </p>
            <span className="text-[10px] text-slate-400">Record</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-500">Win Rate</span>
            <div className="flex items-center justify-center gap-1">
              <Percent size={14} className="text-emerald-700 shrink-0" />
              <span className="text-xl font-extrabold text-slate-950">{personalStats.winRate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden max-w-[80px] mx-auto">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${personalStats.winRate}%` }}></div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-500">Active Streak</span>
            <div className="flex items-center justify-center gap-1">
              {personalStats.streakType === 'win' ? (
                <>
                  <Flame size={16} className="text-amber-500 animate-pulse" />
                  <span className="text-xl font-extrabold text-amber-600">{personalStats.streak} Win</span>
                </>
              ) : personalStats.streakType === 'loss' ? (
                <span className="text-xl font-extrabold text-slate-600">-{personalStats.streak} Loss</span>
              ) : (
                <span className="text-xl font-extrabold text-slate-500">0</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">Current Run</span>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500 shrink-0" />
            Achievements & Milestones
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Unlock badges by playing and winning matches in your clubs.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <AchievementBadge
            unlocked={achievements.onFire}
            title="On Fire"
            description="3+ Win Streak"
            icon="🔥"
            glowClass="shadow-orange-500/10 border-orange-200 bg-orange-50/50 text-orange-600"
            lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
          />
          <AchievementBadge
            unlocked={achievements.giantSlayer}
            title="Giant Slayer"
            description="Beat a higher rank"
            icon="🛡️"
            glowClass="shadow-blue-500/10 border-blue-200 bg-blue-50/50 text-blue-600"
            lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
          />
          <AchievementBadge
            unlocked={achievements.cleanSweep}
            title="Clean Sweep"
            description="Win set by 10+ pts"
            icon="🎯"
            glowClass="shadow-emerald-500/10 border-emerald-200 bg-emerald-50/50 text-emerald-600"
            lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
          />
          <AchievementBadge
            unlocked={achievements.ironMan}
            title="Iron Man"
            description="Play 3+ matches in 1 day"
            icon="🚀"
            glowClass="shadow-purple-500/10 border-purple-200 bg-purple-50/50 text-purple-600"
            lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
          />
          <AchievementBadge
            unlocked={achievements.dynamicDuo}
            title="Dynamic Duo"
            description="3+ doubles streak"
            icon="🤝"
            glowClass="shadow-amber-500/10 border-amber-200 bg-amber-50/50 text-amber-600"
            lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
          />
        </div>
      </section>

      {/* Head-to-Head Rivalry Tool */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
            <Users size={18} className="text-emerald-700 shrink-0" />
            {comparisonMode === 'partner' ? 'Doubles Partnership Checker' : 'Head-to-Head Rivalry Checker'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {comparisonMode === 'partner'
              ? 'Select a club member to analyze your performance playing together on the same team.'
              : 'Select a club member to analyze your head-to-head match history.'}
          </p>
        </div>

        {/* Mode Switcher Toggle and Recommendations */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 w-full max-w-xs shadow-sm">
            <button
              type="button"
              className={`min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition ${
                comparisonMode === 'partner'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/40'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
              onClick={() => {
                setComparisonMode('partner')
                setSelectedRival('')
              }}
            >
              🤝 Partner Stats
            </button>
            <button
              type="button"
              className={`min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition ${
                comparisonMode === 'rival'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/40'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
              onClick={() => {
                setComparisonMode('rival')
                setSelectedRival('')
              }}
            >
              ⚔️ Rival Stats
            </button>
          </div>

          {/* Quick Recommendations */}
          {recommendedInsights && (recommendedInsights.bestPartner || recommendedInsights.topRival || recommendedInsights.nemesis) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Quick recommendations:</span>
              {recommendedInsights.bestPartner && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode('partner')
                    setSelectedRival(recommendedInsights.bestPartner!.name)
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none cursor-pointer ${
                    comparisonMode === 'partner' && selectedRival === recommendedInsights.bestPartner.name
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                  title={`Recommended Teammate: ${recommendedInsights.bestPartner.name}`}
                >
                  🤝 Teammate: {recommendedInsights.bestPartner.name}
                </button>
              )}
              {recommendedInsights.topRival && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode('rival')
                    setSelectedRival(recommendedInsights.topRival!.name)
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none cursor-pointer ${
                    comparisonMode === 'rival' && selectedRival === recommendedInsights.topRival.name
                      ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-500/10'
                      : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50 hover:text-slate-955'
                  }`}
                  title={`Recommended Opponent: ${recommendedInsights.topRival.name}`}
                >
                  ⚔️ Opponent: {recommendedInsights.topRival.name}
                </button>
              )}
              {recommendedInsights.nemesis && (!recommendedInsights.topRival || recommendedInsights.nemesis.name !== recommendedInsights.topRival.name) && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode('rival')
                    setSelectedRival(recommendedInsights.nemesis!.name)
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none cursor-pointer ${
                    comparisonMode === 'rival' && selectedRival === recommendedInsights.nemesis.name
                      ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/10'
                      : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50 hover:text-slate-955'
                  }`}
                  title={`Nemesis (Worst Opponent): ${recommendedInsights.nemesis.name} (${Math.round(recommendedInsights.nemesis.winRate)}% Win Rate)`}
                >
                  ⚔️ Nemesis: {recommendedInsights.nemesis.name}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full sm:max-w-xs space-y-2">
            <label htmlFor="rival-select" className="text-xs font-semibold text-slate-500">
              {comparisonMode === 'partner' ? 'Choose Partner' : 'Choose Rival'}
            </label>
            <select
              id="rival-select"
              value={selectedRival}
              onChange={(e) => setSelectedRival(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">-- Select Member --</option>
              {clubMembers.map((member) => (
                <option key={member.name} value={member.name}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRival && rivalryStats ? (
            <div className="flex-1 space-y-4">
              {rivalryStats.matchesPlayed > 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-950">
                        {comparisonMode === 'partner' ? `You & ${selectedRival}` : `You vs ${selectedRival}`}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {comparisonMode === 'partner'
                          ? 'Your doubles performance when playing together on the same team.'
                          : 'Competitive match record playing on opposite teams.'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShareRivalMatch({
                        rivalName: selectedRival,
                        wins: rivalryStats.wins,
                        losses: rivalryStats.losses,
                        matchesPlayed: rivalryStats.matchesPlayed,
                        mode: comparisonMode
                      })}
                      className="gap-1.5 self-start bg-emerald-750 hover:bg-emerald-850 text-white font-semibold"
                    >
                      <Share2 size={14} />
                      Share {comparisonMode === 'partner' ? 'Partnership' : 'Rivalry'} Card
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white border border-slate-100 rounded-lg">
                      <span className="text-xs text-slate-500 block">Matches</span>
                      <span className="text-lg font-extrabold text-slate-950">{rivalryStats.matchesPlayed}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <span className="text-xs text-emerald-600 block">
                        {comparisonMode === 'partner' ? 'Wins Together' : 'Your Wins'}
                      </span>
                      <span className="text-lg font-extrabold text-emerald-700">{rivalryStats.wins}</span>
                    </div>
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg">
                      <span className="text-xs text-red-600 block">
                        {comparisonMode === 'partner' ? 'Losses Together' : 'Their Wins'}
                      </span>
                      <span className="text-lg font-extrabold text-red-700">{rivalryStats.losses}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">
                        {comparisonMode === 'partner' ? 'Win Rate:' : 'Head-to-Head Streak:'}
                      </span>
                      {comparisonMode === 'partner' ? (
                        <span className="text-emerald-700 font-bold">{rivalryStats.winRate}%</span>
                      ) : rivalryStats.streakType === 'win' ? (
                        <span className="text-emerald-700 font-bold">🔥 {rivalryStats.streak} Win</span>
                      ) : rivalryStats.streakType === 'loss' ? (
                        <span className="text-red-600 font-bold">-{rivalryStats.streak} Loss</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-medium mr-1">
                        {comparisonMode === 'partner' ? 'Partnership Form:' : 'Rivalry Form:'}
                      </span>
                      {rivalryStats.form.map((outcome, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold text-white",
                            outcome === 'W' ? "bg-emerald-600" : "bg-red-500"
                          )}
                        >
                          {outcome}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  {comparisonMode === 'partner'
                    ? `You haven't played any doubles matches together with ${selectedRival} yet.`
                    : `You haven't played any matches against ${selectedRival} yet.`}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-950 text-base">Your Partnership & Rivalry Insights</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personalized recommendations and analysis based on your matches. Click any player's badge above or select from the dropdown to view details.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Top Partners */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>🤝</span> Best Partners
                    </h4>
                    {recommendedInsights?.bestPartnersList && recommendedInsights.bestPartnersList.length > 0 ? (
                      <div className="space-y-1.5">
                        {recommendedInsights.bestPartnersList.map((p, idx) => (
                          <div 
                            key={p.name} 
                            onClick={() => {
                              setComparisonMode('partner')
                              setSelectedRival(p.name)
                            }}
                            className="flex items-center justify-between p-2.5 bg-white border border-slate-150 rounded-lg hover:border-emerald-500 hover:shadow-sm cursor-pointer transition select-none"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 font-mono">#{idx + 1}</span>
                              <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium">{p.matches} matches</span>
                              <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                                {Math.round(p.winRate)}% Win
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg bg-white">
                        Play doubles matches to see recommended partners.
                      </p>
                    )}
                  </div>

                  {/* Top Rivals */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>⚔️</span> Top Rivals
                    </h4>
                    {recommendedInsights?.topRivalsList && recommendedInsights.topRivalsList.length > 0 ? (
                      <div className="space-y-1.5">
                        {recommendedInsights.topRivalsList.map((r, idx) => {
                          const isNemesis = recommendedInsights.nemesis && recommendedInsights.nemesis.name === r.name
                          return (
                            <div 
                              key={r.name} 
                              onClick={() => {
                                setComparisonMode('rival')
                                setSelectedRival(r.name)
                              }}
                              className={`flex items-center justify-between p-2.5 bg-white border rounded-lg hover:shadow-sm cursor-pointer transition select-none ${
                                isNemesis ? 'border-rose-200 hover:border-rose-500' : 'border-slate-150 hover:border-emerald-500'
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 font-mono">#{idx + 1}</span>
                                <span className="text-sm font-semibold text-slate-900 truncate">{r.name}</span>
                                {isNemesis && (
                                  <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.2 bg-rose-50 text-rose-600 rounded border border-rose-100">
                                    Nemesis
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">{r.matches} matches</span>
                                <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${
                                  r.winRate < 50 
                                    ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                    : 'bg-slate-50 text-slate-700 border-slate-250'
                                }`}>
                                  {Math.round(r.winRate)}% Win
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg bg-white">
                        Play matches to see rivalry analysis.
                      </p>
                    )}
                  </div>
                </div>

                {/* Toughest Opponent Pairs Section (Lost a lot to some pairs) */}
                <div className="space-y-2.5 border-t border-slate-200/60 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span>🔥</span> Toughest Opponent Pairs (Doubles)
                  </h4>
                  {recommendedInsights?.worstOpponentPairs && recommendedInsights.worstOpponentPairs.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {recommendedInsights.worstOpponentPairs.map((pair, idx) => (
                        <div 
                          key={pair.names}
                          className="flex flex-col justify-between p-3 bg-white border border-rose-100 hover:border-rose-300 hover:shadow-sm rounded-lg transition"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-rose-500 font-mono">#{idx + 1}</span>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nemesis Pair</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2" title={pair.names}>
                              {pair.names}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-xs">
                            <span className="text-slate-500 font-medium">{pair.matches} played</span>
                            <span className="font-extrabold text-rose-600">
                              {pair.losses} {pair.losses === 1 ? 'loss' : 'losses'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg bg-white">
                      No doubles losses recorded against specific opponent pairs yet. Keep playing to track nemesis pairs!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">Your clubs</h2>
        {clubs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link 
                key={club.id} 
                to={`/club/${club.id}`}
                className="block"
              >
                <Card className="h-full transition hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="space-y-3 pt-4 sm:pt-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <ClubIcon size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-950">{club.name}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{club.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                      <span>{club.city}</span>
                      <span>{club.membersCount} members</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge>{club.role || 'member'}</Badge>
                      {club.role === 'owner' || club.role === 'admin' ? (
                        <Badge className="border-blue-200 bg-blue-50 text-blue-800">
                          <ShieldCheck size={14} aria-hidden="true" />
                          Admin actions
                        </Badge>
                      ) : null}
                      {clubRanks[club.id] ? (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-800 font-bold">
                          🏆 Rank #{clubRanks[club.id].rank} / {clubRanks[club.id].total}
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-5 text-center">
              <p className="text-sm text-slate-600">You have not joined any clubs yet.</p>
              <Link to="/" className="brand-button">
                Find clubs
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">Upcoming game days</h2>
        {events.length ? (
          <div className="grid gap-3">
            {events.map((event) => {
              const myRsvp = myRsvps.find((r) => r.event_id === event.id)
              const eventRsvps = eventRsvpsByEvent[event.id] || []
              const acceptedRsvps = eventRsvps.filter((r) => r.status === 'going')
              const holdingRsvps = eventRsvps.filter((r) => r.status === 'maybe')
              const rejectedRsvps = eventRsvps.filter((r) => r.status === 'not_going')
              const isFull = Boolean(event.max_participants && acceptedRsvps.length >= event.max_participants)
              const eventShareText = buildEventShareText(event)
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(eventShareText)}`

              return (
              <Card key={event.id}>
                <CardContent className="space-y-4 pt-4 sm:pt-5">
                  <div className="flex items-start gap-3">
                  <CalendarDays className="mt-1 shrink-0 text-emerald-700" size={18} aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-950">{event.title}</h3>
                    <p className="text-sm text-slate-500">{event.clubName}</p>
                    <p className="text-sm text-slate-700">{new Date(event.event_date).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">{event.location}</p>
                    {formatEventCost(event) ? <p className="text-sm font-semibold text-slate-800">{formatEventCost(event)}</p> : null}
                  <Badge className={event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'}>
                    {event.signup_open ? 'Open for signup' : 'Closed'}
                  </Badge>
                  </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleNativeEventShare(event)}>
                      <Share2 size={15} aria-hidden="true" />
                      Share
                    </Button>
                    <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50" href={whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle size={15} aria-hidden="true" />
                      WhatsApp
                    </a>
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleCopyEventShareLink(event)}>
                      <Copy size={15} aria-hidden="true" />
                      Copy link
                    </Button>
                  </div>
                  {event.signup_open ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ['going', 'Accept'],
                        ['maybe', 'Hold'],
                        ['not_going', 'Reject'],
                      ].map(([status, label]) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={myRsvp?.status === status ? 'primary' : 'secondary'}
                          disabled={status === 'going' && isFull && myRsvp?.status !== 'going'}
                          onClick={() => handleRsvp(event.id, status as EventRsvp['status'])}
                        >
                          {myRsvp?.status === status ? <Check size={15} aria-hidden="true" /> : null}
                          {label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  {myRsvp ? <p className="text-sm font-semibold text-slate-700">Your response: {getRsvpLabel(myRsvp.status)}</p> : null}
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">{acceptedRsvps.length} accepted</Badge>
                      <Badge className="border-amber-200 bg-amber-50 text-amber-800">{holdingRsvps.length} holding</Badge>
                      <Badge className="border-slate-200 bg-white text-slate-700">{rejectedRsvps.length} rejected</Badge>
                    </div>
                    {acceptedRsvps.length ? (
                      <p className="text-sm leading-6 text-slate-700">
                        Joining: <span className="font-semibold">{acceptedRsvps.map((r) => r.name || 'Member').join(', ')}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">No accepted members yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        ) : (
          <p className="empty-state">No upcoming events.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">Recent match results</h2>
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
          <p className="empty-state">No matches recorded yet.</p>
        )}
      </section>

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

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-slate-500">
          <span className="text-xs font-semibold sm:text-sm">{label}</span>
          <span className="text-emerald-700">{icon}</span>
        </div>
        <p className="text-2xl font-bold leading-none text-slate-950 sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
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
        "flex flex-col items-center justify-center p-3 rounded-xl border text-center space-y-1 transition duration-300 shadow-sm",
        unlocked ? glowClass : lockedClass,
        unlocked && "hover:-translate-y-1 hover:shadow-md"
      )}
    >
      <span className={cn("text-2xl", !unlocked && "grayscale filter")}>{icon}</span>
      <span className="text-xs font-bold">{title}</span>
      <span className="text-[9px] leading-tight text-slate-500">{description}</span>
    </div>
  )
}
