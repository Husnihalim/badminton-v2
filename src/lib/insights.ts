import type { MatchWithDetails } from '../types'

export interface OpponentInsight {
  name: string
  wins: number
  losses: number
  matches: number
  winRate: number
  userId: string | null
  avatarUrl: string | null
}

export interface PlayerInsights {
  bestPartner: { name: string; wins: number; matches: number; winRate: number; userId: string | null; avatarUrl: string | null } | null
  topRival: { name: string; wins: number; matches: number; winRate: number; userId: string | null; avatarUrl: string | null } | null
  toughestOpponent: OpponentInsight | null
  mostDefeatedOpponent: OpponentInsight | null
}

export interface SignatureMoment {
  title: string
  description: string
  date: string
  score: string
}

export function calculatePlayerInsights(
  allUserMatches: MatchWithDetails[],
  userId: string,
  userName: string,
  userDisplayName: string | null | undefined,
  memberProfilesMap: Record<string, { userId: string; avatarUrl: string | null }>
): PlayerInsights {
  if (allUserMatches.length === 0) {
    return {
      bestPartner: null,
      topRival: null,
      toughestOpponent: null,
      mostDefeatedOpponent: null,
    }
  }

  const partners = new Map<string, { wins: number; matches: number }>()
  const rivals = new Map<string, { wins: number; matches: number }>()

  const normalize = (val?: string | null) => (val || '').trim().toLowerCase()
  const normalizedUserName = normalize(userName)
  const normalizedDisplayName = userDisplayName ? normalize(userDisplayName) : ''

  allUserMatches.forEach((m) => {
    const userPart = m.participants.find((p) => p.user_id === userId)
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

      if (p.user_id === userId) return
      const normalizedPName = normalize(pName)
      if (normalizedPName === normalizedUserName) return
      if (normalizedDisplayName && normalizedPName === normalizedDisplayName) return

      if (userPart.team === p.team) {
        if (m.match_type === 'doubles') {
          const stats = partners.get(pName) ?? { wins: 0, matches: 0 }
          stats.matches++
          if (isWin) stats.wins++
          partners.set(pName, stats)
        }
      } else {
        const stats = rivals.get(pName) ?? { wins: 0, matches: 0 }
        stats.matches++
        if (isWin) stats.wins++
        rivals.set(pName, stats)
      }
    })
  })

  // 1. Calculate Best Partner
  const partnersList = Array.from(partners.entries()).map(([name, stats]) => {
    const profile = memberProfilesMap[name.toLowerCase()] || null
    return {
      name,
      ...stats,
      winRate: stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0,
      userId: profile?.userId || null,
      avatarUrl: profile?.avatarUrl || null,
    }
  })

  let bestPartner = null
  const partnerCandidates = partnersList.filter((p) => p.matches >= 2)
  const targetPartners = partnerCandidates.length > 0 ? partnerCandidates : partnersList
  if (targetPartners.length > 0) {
    bestPartner = [...targetPartners].sort(
      (a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches
    )[0]
  }

  // 2. Calculate Rivals List
  const rivalsList = Array.from(rivals.entries()).map(([name, stats]) => {
    const profile = memberProfilesMap[name.toLowerCase()] || null
    return {
      name,
      ...stats,
      losses: stats.matches - stats.wins,
      winRate: stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0,
      userId: profile?.userId || null,
      avatarUrl: profile?.avatarUrl || null,
    }
  })

  // 3. Top Rival
  let topRival = null
  const rivalCandidates = rivalsList.filter((r) => r.matches >= 2)
  const targetRivals = rivalCandidates.length > 0 ? rivalCandidates : rivalsList
  if (targetRivals.length > 0) {
    topRival = [...targetRivals].sort(
      (a, b) => b.matches - a.matches || Math.abs(50 - a.winRate) - Math.abs(50 - b.winRate)
    )[0]
  }

  // 4. Toughest Opponent (Nemesis)
  let nemesis = null
  const nemesisList = rivalsList.filter((r) => r.matches - r.wins > 0)
  if (nemesisList.length > 0) {
    const nemesisCandidates = nemesisList.filter((r) => r.matches >= 2)
    const targetNemesis = nemesisCandidates.length > 0 ? nemesisCandidates : nemesisList
    nemesis = [...targetNemesis].sort(
      (a, b) => a.winRate - b.winRate || b.matches - a.matches || (b.matches - b.wins) - (a.matches - a.wins)
    )[0]
  }

  // 5. Most Defeated Opponent
  let mostDefeated = null
  const defeatList = rivalsList.filter((r) => r.wins > 0)
  if (defeatList.length > 0) {
    mostDefeated = [...defeatList].sort(
      (a, b) => b.wins - a.wins || b.winRate - a.winRate || b.matches - a.matches
    )[0]
  }

  return {
    bestPartner,
    topRival,
    toughestOpponent: nemesis,
    mostDefeatedOpponent: mostDefeated,
  }
}

export function getSignatureMoment(
  allUserMatches: MatchWithDetails[],
  userId: string
): SignatureMoment | null {
  if (allUserMatches.length === 0) return null

  // Scan user matches from most recent, find a significant win
  const wins = allUserMatches.filter((m) => {
    const userPart = m.participants.find((p) => p.user_id === userId)
    if (!userPart) return false

    const scoreSets = m.score_sets || []
    if (scoreSets.length === 0) return false

    const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
    if (team1Sets === team2Sets) return false

    const winningTeam = team1Sets > team2Sets ? 1 : 2
    return userPart.team === winningTeam
  })

  if (wins.length === 0) return null

  // Find the most dramatic win (first check for a 3-set win, or a set that went past 21, e.g. 22-20)
  let dramaticMatch = wins[0]
  let matchReason = 'Defeated'

  for (const m of wins) {
    const scoreSets = m.score_sets || []
    
    // Check if it's a 3-set match
    if (scoreSets.length === 3) {
      dramaticMatch = m
      matchReason = '3-Set Comeback Win'
      break
    }
    
    // Check if any set went to deuce (e.g. 22-20, 23-21)
    const hasDeuceSet = scoreSets.some(
      (s) => Math.max(s.team1_score, s.team2_score) > 21
    )
    if (hasDeuceSet) {
      dramaticMatch = m
      matchReason = 'Deuce Comeback Win'
      break
    }
  }

  // Format the moment
  const userPart = dramaticMatch.participants.find((p) => p.user_id === userId)
  const partnerPart = dramaticMatch.participants.find(
    (p) => p.team === userPart?.team && p.user_id !== userId
  )
  const opponents = dramaticMatch.participants.filter(
    (p) => p.team !== userPart?.team
  )
  const opponentNames = opponents.map((o) => o.name || o.guest_name).join(' & ')

  const partnerText = partnerPart ? ` / ${partnerPart.name || partnerPart.guest_name}` : ''
  const teamText = `${userPart?.name || 'You'}${partnerText}`
  const scoreText = (dramaticMatch.score_sets || [])
    .map((s) => `${s.team1_score}-${s.team2_score}`)
    .join(', ')

  const dateStr = dramaticMatch.match_date 
    ? new Date(dramaticMatch.match_date).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date(dramaticMatch.created_at).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })

  return {
    title: matchReason === '3-Set Comeback Win' ? '3-Set Thrilling Win' : matchReason === 'Deuce Comeback Win' ? 'Deuce Comeback Win' : 'Signature Match Win',
    description: `${teamText} defeated ${opponentNames} in a tough match`,
    date: dateStr,
    score: scoreText,
  }
}
