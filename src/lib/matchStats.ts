import type { MatchWithDetails, ScoreSet } from '../types'

export interface MatchStats {
  team1Sets: number
  team2Sets: number
  team1Points: number
  team2Points: number
  winningTeam: 1 | 2 | null
}

/**
 * Computes won sets and points for Team 1 and Team 2, and determines the winning team.
 */
export function getMatchStats(scoreSets: ScoreSet[]): MatchStats {
  const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
  const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
  const team1Points = scoreSets.reduce((sum, s) => sum + s.team1_score, 0)
  const team2Points = scoreSets.reduce((sum, s) => sum + s.team2_score, 0)
  
  let winningTeam: 1 | 2 | null = null
  if (team1Sets > team2Sets) winningTeam = 1
  else if (team2Sets > team1Sets) winningTeam = 2

  return {
    team1Sets,
    team2Sets,
    team1Points,
    team2Points,
    winningTeam,
  }
}

export interface PlayerStatsResult {
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  streak: number
  streakType: 'win' | 'loss' | null
  form: { won: boolean; setScores: string }[]
}

/**
 * Calculates win/loss counts, win rate, streak, and recent form for a player.
 */
export function calculatePlayerStats(matches: MatchWithDetails[], playerId: string): PlayerStatsResult {
  const userMatches = matches.filter((m) =>
    m.participants.some((p) => p.user_id === playerId)
  )
  userMatches.sort((a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime())

  let wins = 0
  let losses = 0
  let streakCount = 0
  let activeStreakType: 'win' | 'loss' | null = null
  let isStreakBroken = false
  const form: { won: boolean; setScores: string }[] = []

  userMatches.forEach((m, idx) => {
    const userPart = m.participants.find((p) => p.user_id === playerId)
    if (!userPart) return

    const stats = getMatchStats(m.score_sets || [])
    if (!stats.winningTeam) return // skip draws

    const isWin = userPart.team === stats.winningTeam

    if (isWin) {
      wins++
    } else {
      losses++
    }

    const scoreText = m.score_sets.map((s) => `${s.team1_score}-${s.team2_score}`).join(', ')
    if (idx < 5) {
      form.push({ won: isWin, setScores: scoreText })
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
  })

  const totalDecided = wins + losses
  const winRate = totalDecided > 0 ? Math.round((wins / totalDecided) * 100) : 0

  return {
    matchesPlayed: userMatches.length,
    wins,
    losses,
    winRate,
    streak: activeStreakType === null ? 0 : streakCount,
    streakType: activeStreakType,
    form,
  }
}

export interface RivalryStatsResult {
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  form: ('W' | 'L')[]
  streak: number
  streakType: 'win' | 'loss' | null
}

/**
 * Computes head-to-head stats against a selected opponent (rival) or teammate (partner).
 */
export function calculateRivalryStats(
  matches: MatchWithDetails[],
  playerId: string,
  rivalNameOrId: string,
  mode: 'rival' | 'partner'
): RivalryStatsResult {
  const targetMatches = matches.filter((m) => {
    const userPart = m.participants.find((p) => p.user_id === playerId)
    if (!userPart) return false

    const otherPart = m.participants.find(
      (p) => (p.user_id && p.user_id === rivalNameOrId) || 
             (p.name && p.name.toLowerCase() === rivalNameOrId.toLowerCase()) ||
             (p.guest_name && p.guest_name.toLowerCase() === rivalNameOrId.toLowerCase())
    )
    if (!otherPart) return false

    if (mode === 'rival') {
      return userPart.team !== otherPart.team
    } else {
      return m.match_type === 'doubles' && userPart.team === otherPart.team
    }
  })

  targetMatches.sort((a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime())

  let wins = 0
  let losses = 0
  const form: ('W' | 'L')[] = []
  let streakCount = 0
  let streakType: 'win' | 'loss' | null = null
  let isStreakBroken = false

  targetMatches.forEach((m, idx) => {
    const userPart = m.participants.find((p) => p.user_id === playerId)
    if (!userPart) return

    const stats = getMatchStats(m.score_sets || [])
    if (!stats.winningTeam) return

    const isWin = userPart.team === stats.winningTeam

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
        streakCount = 1
      } else if (streakType === 'win' && isWin) {
        streakCount++
      } else if (streakType === 'loss' && !isWin) {
        streakCount++
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
    streak: streakType === null ? 0 : streakCount,
    streakType,
  }
}

export interface RecommendationStats {
  name: string
  wins: number
  matches: number
  winRate: number
}

export interface RecommendedInsightsResult {
  bestPartner: RecommendationStats | null
  topRival: RecommendationStats | null
  nemesis: RecommendationStats | null
  worstOpponentPairs: { names: string; wins: number; losses: number; matches: number; winRate: number }[]
  bestPartnersList: RecommendationStats[]
  topRivalsList: RecommendationStats[]
}

/**
 * Calculates user's best doubles partners, top singles/doubles rivals, nemesis, and toughest opponent pairs.
 */
export function calculateRecommendedInsights(
  matches: MatchWithDetails[],
  playerId: string,
  playerName: string,
  playerDisplayName?: string | null
): RecommendedInsightsResult {
  const partners = new Map<string, { wins: number; matches: number }>()
  const rivals = new Map<string, { wins: number; matches: number }>()
  const opponentPairs = new Map<string, { wins: number; losses: number; matches: number }>()

  matches.forEach((m) => {
    const userPart = m.participants.find((p) => p.user_id === playerId)
    if (!userPart) return

    const stats = getMatchStats(m.score_sets || [])
    if (!stats.winningTeam) return
    
    const isWin = userPart.team === stats.winningTeam

    m.participants.forEach((p) => {
      const pName = p.name || p.guest_name
      if (!pName) return

      if (p.user_id === playerId) return
      if (pName.toLowerCase() === playerName.toLowerCase()) return
      if (playerDisplayName && pName.toLowerCase() === playerDisplayName.toLowerCase()) return

      if (userPart.team === p.team) {
        if (m.match_type === 'doubles') {
          const s = partners.get(pName) ?? { wins: 0, matches: 0 }
          s.matches++
          if (isWin) s.wins++
          partners.set(pName, s)
        }
      } else {
        const s = rivals.get(pName) ?? { wins: 0, matches: 0 }
        s.matches++
        if (isWin) s.wins++
        rivals.set(pName, s)
      }
    })

    if (m.match_type === 'doubles') {
      const oppNames = m.participants
        .filter((p) => p.team !== userPart.team)
        .map((p) => p.name || p.guest_name)
        .filter(Boolean) as string[]

      if (oppNames.length === 2) {
        oppNames.sort()
        const pairKey = oppNames.join(' & ')
        const s = opponentPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
        s.matches++
        if (isWin) {
          s.wins++
        } else {
          s.losses++
        }
        opponentPairs.set(pairKey, s)
      }
    }
  })

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

  let nemesis = null
  const nemesisList = rivalsList.filter((r) => r.matches - r.wins > 0)
  if (nemesisList.length > 0) {
    const nemesisCandidates = nemesisList.filter((r) => r.matches >= 2)
    const targetNemesis = nemesisCandidates.length > 0 ? nemesisCandidates : nemesisList
    nemesis = [...targetNemesis].sort(
      (a, b) => a.winRate - b.winRate || b.matches - a.matches || (b.matches - b.wins) - (a.matches - a.wins)
    )[0]
  }

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
}
