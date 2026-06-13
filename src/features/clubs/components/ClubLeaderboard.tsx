import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useClub, useClubEvents, useClubMembers, useAllClubMatches } from '../hooks/useClubQueries'
import { THEME_MAP } from '../constants'
import { Card, CardContent } from '../../../components/ui/card'
import type { MatchWithDetails } from '../../../types'
import type { ClubLeaderboardRow } from '../../../lib/api'

interface ClubLeaderboardProps {
  clubId: string
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
}

function renderRankBadge(rank: number) {
  if (rank === 1) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 shadow-sm border border-amber-200" title="Gold Medal">🥇</span>
  if (rank === 2) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-[var(--arena-text-muted)] shadow-sm border border-[var(--arena-border)]" title="Silver Medal">🥈</span>
  if (rank === 3) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-800 shadow-sm border border-amber-100" title="Bronze Medal">🥉</span>
  return <span className="font-mono text-sm font-bold text-[var(--arena-text-dim)] w-6 text-center">#{rank}</span>
}

function calculateLeaderboard(matchesList: MatchWithDetails[]): ClubLeaderboardRow[] {
  const playerStats = new Map<string, {
    games: number
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
  }>()

  for (const match of matchesList) {
    const scoreSets = match.score_sets || []
    if (scoreSets.length === 0) continue

    const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
    if (team1Sets === team2Sets) continue // Draw/Tie

    const winningTeam = team1Sets > team2Sets ? 1 : 2

    let team1Points = 0
    let team2Points = 0
    for (const set of scoreSets) {
      team1Points += set.team1_score
      team2Points += set.team2_score
    }

    for (const participant of match.participants) {
      if (participant.is_guest) continue
      const name = participant.name || participant.guest_name || 'Guest'
      const isWin = participant.team === winningTeam

      let stats = playerStats.get(name)
      if (!stats) {
        stats = { games: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }
        playerStats.set(name, stats)
      }

      stats.games += 1
      if (isWin) {
        stats.wins += 1
      } else {
        stats.losses += 1
      }

      if (participant.team === 1) {
        stats.pointsFor += team1Points
        stats.pointsAgainst += team2Points
      } else {
        stats.pointsFor += team2Points
        stats.pointsAgainst += team1Points
      }
    }
  }

  return Array.from(playerStats.entries())
    .map(([name, stats]) => {
      const winPercentage = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0
      const points = stats.pointsFor - stats.pointsAgainst
      return {
        name,
        games: stats.games,
        wins: stats.wins,
        losses: stats.losses,
        winPercentage,
        pointsFor: stats.pointsFor,
        pointsAgainst: stats.pointsAgainst,
        points
      }
    })
    .sort((a, b) => {
      return b.winPercentage - a.winPercentage || b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name)
    })
}

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

  return {
    mvp,
    streakStar,
    resilience,
    playersList
  }
}

export function ClubLeaderboard({ clubId }: ClubLeaderboardProps) {
  const { user } = useAuth()
  const { data: club } = useClub(clubId)
  const { data: members = [] } = useClubMembers(clubId)
  const { data: events = [] } = useClubEvents(clubId)
  const { data: matches = [], isLoading: matchesLoading } = useAllClubMatches(clubId)

  const [timeframe, setTimeframe] = useState<string>('all-time')
  const [sortBy, setSortBy] = useState<'win-rate' | 'elo'>('elo')



  // Filtering matches based on timeframe
  const filteredMatchesForLeaderboard = useMemo(() => {
    if (timeframe === 'all-time') {
      return matches
    }
    
    if (timeframe === 'month') {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      return matches.filter(m => {
        const d = new Date(m.match_date)
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth
      })
    }
    
    if (timeframe === 'week') {
      const today = new Date()
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      const startOfWeek = new Date(today.setDate(diff))
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      return matches.filter(m => {
        const d = new Date(m.match_date)
        return d.getTime() >= startOfWeek.getTime() && d.getTime() <= endOfWeek.getTime()
      })
    }
    
    return matches.filter(m => m.event_id === timeframe)
  }, [matches, timeframe])

  // Calculate Leaderboard rows
  const computedLeaderboard = useMemo(() => {
    const raw = calculateLeaderboard(filteredMatchesForLeaderboard)
    if (sortBy === 'elo') {
      return [...raw].sort((a, b) => {
        const eloA = members.find(m => m.name?.toLowerCase() === a.name.toLowerCase())?.elo_rating ?? 1200
        const eloB = members.find(m => m.name?.toLowerCase() === b.name.toLowerCase())?.elo_rating ?? 1200
        return eloB - eloA || b.winPercentage - a.winPercentage || b.games - a.games
      })
    }
    return raw
  }, [filteredMatchesForLeaderboard, members, sortBy])

  // Weekly highlights
  const weeklyHighlights = useMemo(() => {
    if (matches.length === 0) return null

    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const startOfWeek = new Date(today.setDate(diff))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    const weeklyMatches = matches.filter(m => {
      const d = new Date(m.match_date)
      return d.getTime() >= startOfWeek.getTime() && d.getTime() <= endOfWeek.getTime()
    })

    if (weeklyMatches.length === 0) return null

    return calculateSessionHighlights(weeklyMatches)
  }, [matches])

  // Streaks calculation
  const playerStreaks = useMemo(() => {
    // Sort matches chronologically descending
    const sortedMatchesForStreak = [...matches].sort(
      (a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime()
    )
    const streaks = new Map<string, { count: number; type: 'win' | 'loss' | null; broken: boolean }>()

    for (const match of sortedMatchesForStreak) {
      const scoreSets = match.score_sets || []
      if (scoreSets.length === 0) continue

      const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
      const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
      if (team1Sets === team2Sets) continue // Draw

      const winningTeam = team1Sets > team2Sets ? 1 : 2

      for (const p of match.participants) {
        if (p.is_guest) continue
        const name = p.name || p.guest_name || 'Guest'
        const isWin = p.team === winningTeam
        
        let streakInfo = streaks.get(name)
        if (!streakInfo) {
          streakInfo = { count: 1, type: isWin ? 'win' : 'loss', broken: false }
          streaks.set(name, streakInfo)
        } else if (!streakInfo.broken) {
          if (streakInfo.type === 'win' && isWin) {
            streakInfo.count++
          } else if (streakInfo.type === 'loss' && !isWin) {
            streakInfo.count++
          } else {
            streakInfo.broken = true
          }
        }
      }
    }

    return streaks
  }, [matches])

  if (!club) return null

  const accent = club.accent_color || 'emerald'
  const theme = THEME_MAP[accent] || THEME_MAP.emerald

  return (
    <Card>
      <CardContent className="space-y-4 pt-4 sm:pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Club leaderboard</h2>
            <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">
              {sortBy === 'elo' ? 'Rankings based on competitive Elo ratings.' : 'Rankings based on win rate for the selected timeframe.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Toggle */}
            <div className="inline-flex rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setSortBy('elo')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition select-none cursor-pointer ${
                  sortBy === 'elo'
                    ? `bg-[var(--arena-surface)] ${theme.text} shadow-sm border border-[var(--arena-border)]/50`
                    : "text-[var(--arena-text-muted)] hover:text-slate-900"
                }`}
              >
                ⚡ Elo Rating
              </button>
              <button
                type="button"
                onClick={() => setSortBy('win-rate')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition select-none cursor-pointer ${
                  sortBy === 'win-rate'
                    ? `bg-[var(--arena-surface)] ${theme.text} shadow-sm border border-[var(--arena-border)]/50`
                    : "text-[var(--arena-text-muted)] hover:text-slate-900"
                }`}
              >
                📈 Win Rate
              </button>
            </div>

            <div className="inline-flex rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-1 shadow-sm">
              {[
                { id: 'all-time', label: '🏆 All-Time' },
                { id: 'week', label: '📅 This Week' },
                { id: 'month', label: '📅 This Month' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeframe(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition select-none cursor-pointer ${
                    timeframe === tab.id
                      ? `bg-[var(--arena-surface)] ${theme.text} shadow-sm border border-[var(--arena-border)]/50`
                      : "text-[var(--arena-text-muted)] hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {events.length > 0 && (
              <div className="relative">
                <select
                  value={['all-time', 'week', 'month'].includes(timeframe) ? '' : timeframe}
                  onChange={(e) => {
                    if (e.target.value) {
                      setTimeframe(e.target.value)
                    }
                  }}
                  className={`min-h-9 text-xs font-semibold py-1.5 px-3 border border-[var(--arena-border)] rounded-lg bg-[var(--arena-surface)] text-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-${accent}-600 focus:border-${accent}-600`}
                >
                  <option value="">🎯 Filter by Session</option>
                  {events
                    .slice()
                    .reverse()
                    .map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Highlights in Leaderboard */}
        {weeklyHighlights && (weeklyHighlights.mvp || weeklyHighlights.streakStar || weeklyHighlights.resilience) && (
          <div className="bg-[var(--arena-surface-muted)]/50 dark:bg-slate-900/30 border border-[var(--arena-border)]/60 dark:border-slate-800 rounded-xl p-3 grid gap-3 sm:grid-cols-3">
            {weeklyHighlights.mvp && (() => {
              const mvp = weeklyHighlights.mvp
              const m = members.find(mem => mem.name?.toLowerCase() === mvp.name.toLowerCase())
              return (
                <div className="relative overflow-hidden rounded-lg border border-amber-250 bg-amber-500/5 dark:bg-amber-950/10 p-3 shadow-sm flex flex-col justify-between min-h-[90px]">
                  <div className="absolute top-2 right-2 text-sm">🏆</div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Weekly MVP</span>
                    <h4 className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                      {m?.user_id ? (
                        <>
                          <Link to={`/member/${m.user_id}`} className="shrink-0 flex items-center">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-amber-500/20" />
                            ) : (
                              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-amber-500/10 text-[9px] font-bold text-amber-700 dark:text-amber-450 border border-amber-500/20">
                                {mvp.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <Link to={`/member/${m.user_id}`} className={`hover:underline truncate ${theme.text} dark:${theme.textLight}`}>
                            {mvp.name}
                          </Link>
                        </>
                      ) : (
                        <>
                          {m?.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-amber-500/20 shrink-0" />
                          ) : (
                            <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[9px] font-bold text-amber-700 dark:text-amber-450 border border-amber-500/20">
                              {mvp.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{mvp.name}</span>
                        </>
                      )}
                    </h4>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-bold text-amber-750 dark:text-amber-400">
                    <span>🔥 {Math.round(mvp.winRate)}% Win</span>
                    <span className="text-[10px] text-[var(--arena-text-dim)] dark:text-[var(--arena-text-dim)] font-semibold">({mvp.wins}W-{mvp.losses}L)</span>
                  </div>
                </div>
              )
            })()}

            {weeklyHighlights.streakStar && (() => {
              const streakStar = weeklyHighlights.streakStar
              const m = members.find(mem => mem.name?.toLowerCase() === streakStar.name.toLowerCase())
              return (
                <div className="relative overflow-hidden rounded-lg border border-orange-250 bg-orange-500/5 dark:bg-orange-950/10 p-3 shadow-sm flex flex-col justify-between min-h-[90px]">
                  <div className="absolute top-2 right-2 text-sm">🔥</div>
                  <div>
                    <span className="text-[10px] font-extrabold text-orange-705 dark:text-orange-400 uppercase tracking-wider block">Streak Star</span>
                    <h4 className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                      {m?.user_id ? (
                        <>
                          <Link to={`/member/${m.user_id}`} className="shrink-0 flex items-center">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-orange-500/20" />
                            ) : (
                              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-orange-500/10 text-[9px] font-bold text-orange-700 dark:text-orange-450 border border-orange-500/20">
                                {streakStar.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <Link to={`/member/${m.user_id}`} className={`hover:underline truncate ${theme.text} dark:${theme.textLight}`}>
                            {streakStar.name}
                          </Link>
                        </>
                      ) : (
                        <>
                          {m?.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-orange-500/20 shrink-0" />
                          ) : (
                            <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[9px] font-bold text-orange-700 dark:text-orange-450 border border-orange-500/20">
                              {streakStar.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{streakStar.name}</span>
                        </>
                      )}
                    </h4>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-bold text-orange-750 dark:text-orange-400">
                    <span>📈 {streakStar.longestStreak} Streak</span>
                    <span className="text-[10px] text-[var(--arena-text-dim)] dark:text-[var(--arena-text-dim)] font-semibold">{streakStar.wins} Wins</span>
                  </div>
                </div>
              )
            })()}

            {weeklyHighlights.resilience && (() => {
              const resilience = weeklyHighlights.resilience
              const m = members.find(mem => mem.name?.toLowerCase() === resilience.name.toLowerCase())
              return (
                <div className={`relative overflow-hidden rounded-lg border border-${accent}-250 bg-${accent}-500/5 dark:bg-${accent}-950/10 p-3 shadow-sm flex flex-col justify-between min-h-[90px]`}>
                  <div className="absolute top-2 right-2 text-sm">💪</div>
                  <div>
                    <span className={`text-[10px] font-extrabold ${theme.text} dark:${theme.textLight} uppercase tracking-wider block`}>Resilience</span>
                    <h4 className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                      {m?.user_id ? (
                        <>
                          <Link to={`/member/${m.user_id}`} className="shrink-0 flex items-center">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-emerald-500/20" />
                            ) : (
                              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-slate-500/10 text-[9px] font-bold text-slate-500 border border-slate-500/20">
                                {resilience.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <Link to={`/member/${m.user_id}`} className={`hover:underline truncate ${theme.text} dark:${theme.textLight}`}>
                            {resilience.name}
                          </Link>
                        </>
                      ) : (
                        <>
                          {m?.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-emerald-500/20 shrink-0" />
                          ) : (
                            <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-[9px] font-bold text-slate-500 border border-slate-500/20">
                              {resilience.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{resilience.name}</span>
                        </>
                      )}
                    </h4>
                  </div>
                  <div className={`mt-2 flex items-center justify-between text-xs font-bold text-${accent}-750 dark:${theme.textLight}`}>
                    <span>{resilience.games} Matches</span>
                    <span className="text-[10px] text-[var(--arena-text-dim)] dark:text-[var(--arena-text-dim)] font-semibold">({resilience.wins}W-{resilience.losses}L)</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {computedLeaderboard.length ? (
          <div className="rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] overflow-hidden shadow-sm">
            {/* High-density table headers */}
            <div className="grid grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[3rem_1fr_3.5rem_5rem_4.5rem] gap-2 px-3 py-2 text-[10px] sm:text-xs font-bold text-[var(--arena-text-muted)] border-b border-[var(--arena-border)] uppercase tracking-wider items-center bg-[var(--arena-surface-muted)]/20">
              <div className="text-center">Rank</div>
              <div>Player</div>
              <div className="hidden sm:block text-center">GP</div>
              <div className="hidden sm:block text-center">Record</div>
              <div className="text-right">Win %</div>
            </div>

            <div className="divide-y divide-[var(--arena-border)]/50">
              {computedLeaderboard.map((player, index) => {
                const streak = playerStreaks.get(player.name)
                const hasWinStreak = streak && streak.type === 'win' && streak.count >= 2
                const isMe = user && (
                  user.name?.toLowerCase() === player.name.toLowerCase() ||
                  user.display_name?.toLowerCase() === player.name.toLowerCase()
                )

                return (
                  <div 
                    key={player.name} 
                    className={`grid grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[3rem_1fr_3.5rem_5rem_4.5rem] gap-2 px-3 py-2.5 items-center hover:bg-[var(--arena-surface-muted)]/30 transition-colors text-xs sm:text-sm ${
                      isMe ? 'bg-[var(--arena-accent-soft)]/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex justify-center items-center">
                      {renderRankBadge(index + 1)}
                    </div>

                    {/* Player Info (Avatar, Name, Elo, Streak) */}
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const match = members.find(m => m.name?.toLowerCase() === player.name.toLowerCase())
                        const elo = match?.elo_rating || 1200
                        const avatar = match?.avatar_url
                        const avatarEl = avatar ? (
                          <img src={avatar} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-[var(--arena-border)] shrink-0" />
                        ) : (
                          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[9px] font-bold text-[var(--arena-text-muted)] border border-[var(--arena-border)] uppercase">
                            {player.name.charAt(0)}
                          </div>
                        )
                        return (
                          <>
                            {match?.user_id ? (
                              <Link to={`/member/${match.user_id}`} className="shrink-0 flex items-center">
                                {avatarEl}
                              </Link>
                            ) : (
                              avatarEl
                            )}
                            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              {match?.user_id ? (
                                <Link to={`/member/${match.user_id}`} className="font-bold hover:underline truncate max-w-[80px] sm:max-w-none text-[var(--arena-text)]" title={player.name}>
                                  {player.name}
                                </Link>
                              ) : (
                                <span className="font-bold truncate max-w-[80px] sm:max-w-none text-[var(--arena-text)]" title={player.name}>
                                  {player.name}
                                </span>
                              )}
                              <span className="shrink-0 text-[10px] font-extrabold text-[var(--arena-accent)]">
                                ⚡ {elo}
                              </span>
                              {hasWinStreak && (
                                <span className="shrink-0 text-[9px] px-1 bg-amber-500/10 text-amber-500 rounded font-black flex items-center gap-0.5" title={`${streak.count} win streak`}>
                                  <Flame size={10} className="fill-amber-500" />
                                  {streak.count}
                                </span>
                              )}
                              {user && !isMe && (
                                <Link
                                  to={`/dashboard?rival=${player.name}`}
                                  className="text-[9px] font-extrabold text-[var(--arena-accent)] hover:underline opacity-80 hover:opacity-100"
                                  title="Compare Head-to-Head"
                                >
                                  ⚔️ H2H
                                </Link>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* GP */}
                    <div className="hidden sm:block text-center font-semibold text-[var(--arena-text-muted)]">
                      {player.games}
                    </div>

                    {/* Record (W-L) */}
                    <div className="hidden sm:block text-center font-semibold text-[var(--arena-text-dim)] text-[10px] sm:text-xs">
                      <span className="text-[var(--arena-accent)]">{player.wins}W</span>
                      <span className="mx-0.5 text-slate-500">-</span>
                      <span className="text-red-500">{player.losses}L</span>
                    </div>

                    {/* Win % */}
                    <div className="text-right font-bold text-[var(--arena-text)]">
                      {player.winPercentage}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
            {matchesLoading ? 'Loading leaderboard...' : 'No matches recorded for this timeframe.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
