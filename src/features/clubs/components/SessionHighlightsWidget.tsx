import { Link } from 'react-router-dom'
import { X, Share2 } from 'lucide-react'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import type { ClubEvent, MatchWithDetails, Membership } from '../../../types'

interface SessionHighlightsWidgetProps {
  isOpen: boolean
  onClose: () => void
  event: ClubEvent
  matches: MatchWithDetails[]
  members: Membership[]
  onShareMatch: (match: MatchWithDetails) => void
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

  const duosList = Array.from(duos.entries()).map(([names, stats]) => {
    const winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0
    return { names, ...stats, winRate }
  })

  const powerDuoCandidates = duosList.filter(d => d.matches >= 2)
  let powerDuo = null
  if (powerDuoCandidates.length > 0) {
    powerDuo = [...powerDuoCandidates].sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0]
  } else if (duosList.length > 0) {
    powerDuo = [...duosList].sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0]
  }

  const rivalries = new Map<string, number>()
  for (const match of chronMatches) {
    const team1P = match.participants.filter(p => p.team === 1).map(p => p.name || p.guest_name || 'Guest')
    const team2P = match.participants.filter(p => p.team === 2).map(p => p.name || p.guest_name || 'Guest')

    for (const p1 of team1P) {
      for (const p2 of team2P) {
        const key = [p1, p2].sort().join(' vs ')
        rivalries.set(key, (rivalries.get(key) ?? 0) + 1)
      }
    }
  }

  const rivalriesList = Array.from(rivalries.entries()).map(([names, count]) => ({names, count}))
  const rivalryCandidates = rivalriesList.filter(r => r.count >= 2)
  let rivalry = null
  if (rivalryCandidates.length > 0) {
    rivalry = [...rivalryCandidates].sort((a, b) => b.count - a.count)[0]
  }

  const totalMatches = eventMatches.length
  let totalPoints = 0
  let totalSets = 0
  const uniquePlayers = new Set<string>()
  let clutchMatches = 0
  let maxScoreSum = 0
  let highestScoreStr = '-'
  let maxMargin = -1
  let dominantScoreStr = '-'

  for (const match of eventMatches) {
    for (const p of match.participants) {
      const name = p.name || p.guest_name || 'Guest'
      uniquePlayers.add(name)
    }

    let matchIsClutch = false
    const scoreSets = match.score_sets || []
    for (const set of scoreSets) {
      totalPoints += set.team1_score + set.team2_score
      totalSets++

      const scoreSum = set.team1_score + set.team2_score
      const margin = Math.abs(set.team1_score - set.team2_score)

      if (margin <= 3) {
        matchIsClutch = true
      }

      if (scoreSum > maxScoreSum) {
        maxScoreSum = scoreSum
        highestScoreStr = `${Math.max(set.team1_score, set.team2_score)} - ${Math.min(set.team1_score, set.team2_score)}`
      }

      if (margin > maxMargin) {
        maxMargin = margin
        dominantScoreStr = `${Math.max(set.team1_score, set.team2_score)} - ${Math.min(set.team1_score, set.team2_score)}`
      }
    }
    if (matchIsClutch) {
      clutchMatches++
    }
  }

  const totalPlayers = uniquePlayers.size
  const avgSetsPerMatch = totalMatches > 0 ? (totalSets / totalMatches).toFixed(1) : '0.0'
  const avgPointsPerSet = totalSets > 0 ? (totalPoints / totalSets).toFixed(1) : '0.0'

  return {
    mvp,
    streakStar,
    resilience,
    powerDuo,
    rivalry,
    stats: {
      totalMatches,
      totalPoints,
      avgSetsPerMatch,
      avgPointsPerSet,
      totalPlayers,
      clutchMatches,
      highestScoreStr,
      dominantScoreStr,
    },
    playersList: playersList.sort((a, b) => b.pointDiff - a.pointDiff || b.winRate - a.winRate)
  }
}

export function SessionHighlightsWidget({
  isOpen,
  onClose,
  event,
  matches,
  members,
  onShareMatch
}: SessionHighlightsWidgetProps) {
  if (!isOpen) return null

  const eventMatches = matches.filter(m => m.event_id === event.id)
  const highlights = calculateSessionHighlights(eventMatches)
  const eventDateStr = new Date(event.event_date).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })



  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 md:p-6" onClick={onClose}>
      <Card className="w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-xl shadow-2xl bg-slate-900 border-x-0 border-t-0 sm:border border-slate-800 text-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative px-4 py-4 md:px-6 md:py-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex-none">
          <div className="absolute top-3 right-3 md:top-4 md:right-4">
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-[var(--arena-text-dim)] hover:text-white hover:bg-slate-800 rounded-full h-8 w-8 md:h-9 md:w-9">
              <X size={18} />
            </Button>
          </div>
          <div className="flex flex-col gap-1 pr-10">
            <Badge className="w-fit border-amber-500 bg-amber-500/10 text-amber-500 font-extrabold uppercase tracking-wider text-[9px] px-2 py-0.5">
              ⭐ Game Night Summary
            </Badge>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
              {event.title}
            </h2>
            <p className="text-xs text-[var(--arena-text-dim)] font-medium">
              📅 {eventDateStr} {event.location ? `· 📍 ${event.location}` : ''}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <CardContent className="p-4 md:p-6 space-y-6 md:space-y-8 flex-1 overflow-y-auto bg-slate-950 text-slate-100">
          
          {/* Session Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Active Players', highlights.stats.totalPlayers, '👥'],
              ['Matches Played', highlights.stats.totalMatches, '🎾'],
              ['Clutch Matches', highlights.stats.clutchMatches, '🔥'],
              ['Highest Set Score', highlights.stats.highestScoreStr, '⚡']
            ].map(([label, val, emoji]) => (
              <div key={label} className="bg-slate-950/40 rounded-lg p-3 border border-slate-800/60 text-center flex flex-col items-center justify-center min-h-[80px]">
                <span className="text-xl mb-1 block">{emoji}</span>
                <span className="block text-base md:text-lg font-bold text-white leading-tight">{val}</span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--arena-text-dim)] mt-0.5">{label}</span>
              </div>
            ))}
          </div>

          {/* Accordion/Cards of highlights */}
          <div>
            <h3 className="text-xs font-bold text-[var(--arena-text-dim)] uppercase tracking-widest mb-3">🏆 Tonight's Highlights</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* MVP (King of the Court) */}
              {highlights.mvp && (
                <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-4 md:p-5 shadow-lg shadow-amber-950/20">
                  <div className="absolute top-2 right-2 text-2xl">👑</div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">King of the Court</span>
                  <h4 className="mt-1.5 text-base md:text-lg font-extrabold text-white truncate">{highlights.mvp.name}</h4>
                  <p className="mt-2 text-xs font-semibold text-amber-400/90">
                    🔥 {Math.round(highlights.mvp.winRate)}% Win Rate ({highlights.mvp.wins}W-{highlights.mvp.losses}L)
                  </p>
                  <p className="text-[11px] text-[var(--arena-text-dim)] mt-1">
                    Point Diff: <span className="font-semibold text-[var(--arena-accent)]">+{highlights.mvp.pointDiff}</span>
                  </p>
                  <p className="mt-3 text-[10px] italic text-[var(--arena-text-dim)]">The most dominant player of the night.</p>
                </div>
              )}

              {/* Streak Star */}
              {highlights.streakStar && (
                <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent p-4 md:p-5 shadow-lg shadow-orange-950/20">
                  <div className="absolute top-2 right-2 text-2xl">🔥</div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Streak Star</span>
                  <h4 className="mt-1.5 text-base md:text-lg font-extrabold text-white truncate">{highlights.streakStar.name}</h4>
                  <p className="mt-2 text-xs font-semibold text-orange-400/90">
                    📈 {highlights.streakStar.longestStreak} Win Streak
                  </p>
                  <p className="text-[11px] text-[var(--arena-text-dim)] mt-1">
                    Total Wins: <span className="font-semibold text-white">{highlights.streakStar.wins}</span>
                  </p>
                  <p className="mt-3 text-[10px] italic text-[var(--arena-text-dim)]">Unstoppable momentum on the court!</p>
                </div>
              )}

              {/* Resilience Award */}
              {highlights.resilience && (
                <div className="relative overflow-hidden rounded-xl border border-[var(--arena-accent)]/30 bg-gradient-to-b from-[var(--arena-accent)]/10 to-transparent p-4 md:p-5 shadow-lg shadow-[var(--arena-bg)]/20">
                  <div className="absolute top-2 right-2 text-2xl">🛠️</div>
                  <span className="text-[10px] font-bold text-[var(--arena-accent)] uppercase tracking-widest">Resilience Award</span>
                  <h4 className="mt-1.5 text-base md:text-lg font-extrabold text-white truncate">{highlights.resilience.name}</h4>
                  <p className="mt-2 text-xs font-semibold text-[var(--arena-accent)]/90">
                    💪 Played {highlights.resilience.games} Matches
                  </p>
                  <p className="text-[11px] text-[var(--arena-text-dim)] mt-1">
                    Wins: {highlights.resilience.wins} · Losses: {highlights.resilience.losses}
                  </p>
                  <p className="mt-3 text-[10px] italic text-[var(--arena-text-dim)]">Showed great stamina and competitive spirit!</p>
                </div>
              )}

              {/* Power Duo */}
              {highlights.powerDuo && (
                <div className="relative overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/10 to-transparent p-4 md:p-5 shadow-lg shadow-indigo-950/20">
                  <div className="absolute top-2 right-2 text-2xl">🤝</div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Power Duo</span>
                  <h4 className="mt-1.5 text-sm font-extrabold text-white truncate" title={highlights.powerDuo.names}>{highlights.powerDuo.names}</h4>
                  <p className="mt-2 text-xs font-semibold text-indigo-400/90">
                    🏆 {Math.round(highlights.powerDuo.winRate)}% Win Rate
                  </p>
                  <p className="text-[11px] text-[var(--arena-text-dim)] mt-1">
                    Record: {highlights.powerDuo.wins} Wins / {highlights.powerDuo.matches} Matches
                  </p>
                  <p className="mt-3 text-[10px] italic text-[var(--arena-text-dim)]">The night's most synergistic team pairing.</p>
                </div>
              )}

              {/* Rivalry of the Night */}
              {highlights.rivalry && (
                <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-b from-red-500/10 to-transparent p-4 md:p-5 shadow-lg shadow-red-950/20">
                  <div className="absolute top-2 right-2 text-2xl">⚔️</div>
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Night's Rivalry</span>
                  <h4 className="mt-1.5 text-sm font-extrabold text-white truncate" title={highlights.rivalry.names}>{highlights.rivalry.names}</h4>
                  <p className="mt-2 text-xs font-semibold text-red-400/90">
                    💥 Faced Off {highlights.rivalry.count} Times
                  </p>
                  <p className="text-[11px] text-[var(--arena-text-dim)] mt-1">
                    A close, competitive battle!
                  </p>
                  <p className="mt-3 text-[10px] italic text-[var(--arena-text-dim)]">Most matches played on opposing teams.</p>
                </div>
              )}

            </div>
          </div>

          {/* Night's Standings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--arena-text-dim)] uppercase tracking-widest">📈 Standings for this Session</h3>
            <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-900/60 font-sans">
              <table className="w-full text-left border-collapse text-[11px] md:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[var(--arena-text-dim)] font-bold uppercase tracking-wider text-[9px] md:text-[10px]">
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4">Rank</th>
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4">Player</th>
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4 text-center">GP</th>
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4 text-center">W-L</th>
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4 text-center">Win%</th>
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4 text-right">Pts Ratio</th>
                    <th className="py-2.5 px-2.5 md:py-3 md:px-4 text-right">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {highlights.playersList.map((player, idx) => {
                    const m = members.find(mem => mem.name?.toLowerCase() === player.name.toLowerCase())
                    return (
                      <tr key={player.name} className="hover:bg-slate-800/40 text-slate-200">
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 font-bold text-[var(--arena-text-dim)]">{idx + 1}</td>
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 font-semibold text-white">
                          <div className="flex items-center gap-2 min-w-0">
                            {m?.avatar_url ? (
                              m.user_id ? (
                                <Link to={`/member/${m.user_id}`} onClick={onClose} className="shrink-0 flex items-center">
                                  <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-slate-700" />
                                </Link>
                              ) : (
                                <img src={m.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-slate-700 shrink-0" />
                              )
                            ) : (
                              m?.user_id ? (
                                <Link to={`/member/${m.user_id}`} onClick={onClose} className="shrink-0 flex items-center">
                                  <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 border border-slate-700 uppercase">
                                    {player.name.charAt(0)}
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 border border-slate-700 uppercase">
                                  {player.name.charAt(0)}
                                </div>
                              )
                            )}
                            {m?.user_id ? (
                              <Link to={`/member/${m.user_id}`} onClick={onClose} className="hover:underline text-white truncate">
                                {player.name}
                              </Link>
                            ) : (
                              <span className="truncate">{player.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 text-center font-mono">{player.games}</td>
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 text-center font-mono text-slate-300">{player.wins} - {player.losses}</td>
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 text-center font-mono">{Math.round(player.winRate)}%</td>
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 text-right font-mono text-[var(--arena-text-dim)]">{player.pointsFor} / {player.pointsAgainst}</td>
                        <td className="py-2.5 px-2.5 md:py-3 md:px-4 text-right font-mono font-bold text-[var(--arena-accent)]">{player.pointDiff > 0 ? `+${player.pointDiff}` : player.pointDiff}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Session Match Logs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--arena-text-dim)] uppercase tracking-widest">📝 Match Records</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {eventMatches.map((match) => {
                const t1 = match.participants.filter(p => p.team === 1).map(p => p.name || p.guest_name || 'Guest').join(' & ')
                const t2 = match.participants.filter(p => p.team === 2).map(p => p.name || p.guest_name || 'Guest').join(' & ')
                
                const scoreSets = match.score_sets || []
                const t1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
                const t2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
                const matchWinner = t1Sets > t2Sets ? 1 : 2

                return (
                  <div key={match.id} className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3.5 md:p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{match.sport} · {match.match_type}</span>
                      <span className="text-[10px] text-[var(--arena-text-dim)]">{new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      {/* Team 1 */}
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-semibold truncate max-w-[180px] ${matchWinner === 1 ? 'text-amber-400 font-bold' : 'text-[var(--arena-text-dim)]'}`}>
                          {matchWinner === 1 ? '👑 ' : ''}{t1}
                        </span>
                        <span className={`font-mono text-sm ${matchWinner === 1 ? 'font-bold text-amber-400' : 'text-[var(--arena-text-dim)]'}`}>{t1Sets}</span>
                      </div>
                      
                      {/* Team 2 */}
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-semibold truncate max-w-[180px] ${matchWinner === 2 ? 'text-[var(--arena-accent)] font-bold' : 'text-[var(--arena-text-dim)]'}`}>
                          {matchWinner === 2 ? '👑 ' : ''}{t2}
                        </span>
                        <span className={`font-mono text-sm ${matchWinner === 2 ? 'font-bold text-[var(--arena-accent)]' : 'text-[var(--arena-text-dim)]'}`}>{t2Sets}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[var(--arena-text-dim)]">
                        Sets: {scoreSets.map(s => `${s.team1_score}-${s.team2_score}`).join(', ')}
                      </span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => onShareMatch(match)} title="Share Scorecard" className="h-6 w-6 text-[var(--arena-text-dim)] hover:text-white hover:bg-slate-800">
                        <Share2 size={12} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </CardContent>

        {/* Footer */}
        <div className="bg-slate-900 px-4 py-3 md:px-6 md:py-4 border-t border-slate-800 flex justify-between items-center text-xs text-[var(--arena-text-dim)] flex-none">
          <span className="text-[10px] md:text-xs tracking-wider">POWERED BY KELABSUKAN.COM</span>
          <Button type="button" size="sm" variant="secondary" onClick={onClose} className="h-8 md:h-9 text-xs">
            Close Summary
          </Button>
        </div>

      </Card>
    </div>
  )
}
