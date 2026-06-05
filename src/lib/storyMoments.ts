import type { MatchParticipant, MatchWithDetails, User } from '../types'

export type StoryMomentType =
  | 'win_streak'
  | 'response_needed'
  | 'comeback_win'
  | 'clean_sweep'
  | 'close_match'
  | 'rivalry_watch'
  | 'best_partner'
  | 'latest_result'

export interface StoryMoment {
  id: string
  type: StoryMomentType
  title: string
  body: string
  proofLabel: string
  matchId?: string
  clubId?: string
  clubName?: string
  matchDate?: string
  priority: number
}

type StoryMatch = MatchWithDetails & { clubName?: string }

type GenerateStoryMomentsInput = {
  user: Pick<User, 'id' | 'name' | 'display_name'>
  matches: StoryMatch[]
  limit?: number
}

type MatchResult = {
  match: StoryMatch
  userPart: MatchParticipant
  winningTeam: 1 | 2
  isWin: boolean
  scoreline: string
  userTeamSets: number
  opponentTeamSets: number
  userTeamPoints: number
  opponentTeamPoints: number
}

function getMatchTime(match: StoryMatch) {
  return new Date(match.match_date || match.created_at).getTime()
}

function getTeamSetWins(match: StoryMatch) {
  const team1Sets = match.score_sets.filter((set) => set.team1_score > set.team2_score).length
  const team2Sets = match.score_sets.filter((set) => set.team2_score > set.team1_score).length

  if (team1Sets === team2Sets) return null
  return {
    winningTeam: team1Sets > team2Sets ? 1 as const : 2 as const,
    team1Sets,
    team2Sets,
  }
}

function getParticipantName(participant: MatchParticipant) {
  return participant.name || participant.guest_name || 'Guest player'
}

function getMatchLabel(match: StoryMatch) {
  return match.title || `${match.match_type === 'doubles' ? 'Doubles' : 'Singles'} match`
}

function getScoreline(match: StoryMatch) {
  return match.score_sets
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.team1_score}-${set.team2_score}`)
    .join(', ')
}

function buildResult(match: StoryMatch, userId: string): MatchResult | null {
  const userPart = match.participants.find((participant) => participant.user_id === userId)
  if (!userPart || match.score_sets.length === 0) return null

  const setWins = getTeamSetWins(match)
  if (!setWins) return null

  const userTeamSets = userPart.team === 1 ? setWins.team1Sets : setWins.team2Sets
  const opponentTeamSets = userPart.team === 1 ? setWins.team2Sets : setWins.team1Sets
  const userTeamPoints = match.score_sets.reduce(
    (sum, set) => sum + (userPart.team === 1 ? set.team1_score : set.team2_score),
    0
  )
  const opponentTeamPoints = match.score_sets.reduce(
    (sum, set) => sum + (userPart.team === 1 ? set.team2_score : set.team1_score),
    0
  )

  return {
    match,
    userPart,
    winningTeam: setWins.winningTeam,
    isWin: userPart.team === setWins.winningTeam,
    scoreline: getScoreline(match),
    userTeamSets,
    opponentTeamSets,
    userTeamPoints,
    opponentTeamPoints,
  }
}

function createMatchMoment(
  type: StoryMomentType,
  result: MatchResult,
  title: string,
  body: string,
  priority: number
): StoryMoment {
  return {
    id: `${type}-${result.match.id}`,
    type,
    title,
    body,
    proofLabel: `Proof: ${result.scoreline}`,
    matchId: result.match.id,
    clubId: result.match.club_id,
    clubName: result.match.clubName,
    matchDate: result.match.match_date || result.match.created_at,
    priority,
  }
}

function getOtherPlayers(match: StoryMatch, userPart: MatchParticipant, sameTeam: boolean) {
  return match.participants
    .filter((participant) => participant.id !== userPart.id && (sameTeam ? participant.team === userPart.team : participant.team !== userPart.team))
    .map(getParticipantName)
    .filter(Boolean)
}

export function generateStoryMoments({ user, matches, limit = 4 }: GenerateStoryMomentsInput): StoryMoment[] {
  const results = matches
    .map((match) => buildResult(match, user.id))
    .filter((result): result is MatchResult => Boolean(result))
    .sort((a, b) => getMatchTime(b.match) - getMatchTime(a.match))

  if (!results.length) return []

  const moments: StoryMoment[] = []
  const displayName = user.display_name || user.name

  let streakType: 'win' | 'loss' | null = null
  let streakCount = 0
  for (const result of results) {
    const currentType = result.isWin ? 'win' : 'loss'
    if (streakType === null) {
      streakType = currentType
      streakCount = 1
      continue
    }
    if (streakType !== currentType) break
    streakCount++
  }

  if (streakType === 'win' && streakCount >= 2) {
    moments.push({
      id: `win-streak-${results[0].match.id}`,
      type: 'win_streak',
      title: `${streakCount}-match winning run`,
      body: `${displayName} has momentum after stacking ${streakCount} straight wins.`,
      proofLabel: `Latest proof: ${results[0].scoreline}`,
      matchId: results[0].match.id,
      clubId: results[0].match.club_id,
      clubName: results[0].match.clubName,
      matchDate: results[0].match.match_date || results[0].match.created_at,
      priority: 100,
    })
  } else if (streakType === 'loss' && streakCount >= 2) {
    moments.push({
      id: `response-needed-${results[0].match.id}`,
      type: 'response_needed',
      title: 'Response match needed',
      body: `${displayName} has a clear next-session hook after ${streakCount} straight losses.`,
      proofLabel: `Latest proof: ${results[0].scoreline}`,
      matchId: results[0].match.id,
      clubId: results[0].match.club_id,
      clubName: results[0].match.clubName,
      matchDate: results[0].match.match_date || results[0].match.created_at,
      priority: 95,
    })
  }

  const comeback = results.find((result) => {
    const firstSet = result.match.score_sets.sort((a, b) => a.set_number - b.set_number)[0]
    if (!firstSet || !result.isWin) return false
    const lostFirstSet = result.userPart.team === 1
      ? firstSet.team1_score < firstSet.team2_score
      : firstSet.team2_score < firstSet.team1_score
    return lostFirstSet && result.match.score_sets.length >= 2
  })

  if (comeback) {
    moments.push(createMatchMoment(
      'comeback_win',
      comeback,
      'Comeback win',
      `${displayName} lost the opening set, then turned the match around.`,
      90
    ))
  }

  const cleanSweep = results.find((result) => (
    result.isWin && result.userTeamSets > 0 && result.match.score_sets.some((set) => {
      const margin = result.userPart.team === 1
        ? set.team1_score - set.team2_score
        : set.team2_score - set.team1_score
      return margin >= 8
    })
  ))

  if (cleanSweep) {
    moments.push(createMatchMoment(
      'clean_sweep',
      cleanSweep,
      'Dominant set',
      `${displayName} produced a statement set with an 8-point margin or better.`,
      80
    ))
  }

  const closeMatch = results.find((result) => (
    Math.abs(result.userTeamPoints - result.opponentTeamPoints) <= 4
  ))

  if (closeMatch) {
    moments.push(createMatchMoment(
      'close_match',
      closeMatch,
      'Close match',
      `${getMatchLabel(closeMatch.match)} came down to small margins.`,
      75
    ))
  }

  const opponents = new Map<string, { matches: number; wins: number; latest: MatchResult }>()
  const partners = new Map<string, { matches: number; wins: number; latest: MatchResult }>()

  results.forEach((result) => {
    getOtherPlayers(result.match, result.userPart, false).forEach((name) => {
      const stats = opponents.get(name) ?? { matches: 0, wins: 0, latest: result }
      stats.matches++
      if (result.isWin) stats.wins++
      if (getMatchTime(result.match) >= getMatchTime(stats.latest.match)) stats.latest = result
      opponents.set(name, stats)
    })

    if (result.match.match_type === 'doubles') {
      getOtherPlayers(result.match, result.userPart, true).forEach((name) => {
        const stats = partners.get(name) ?? { matches: 0, wins: 0, latest: result }
        stats.matches++
        if (result.isWin) stats.wins++
        if (getMatchTime(result.match) >= getMatchTime(stats.latest.match)) stats.latest = result
        partners.set(name, stats)
      })
    }
  })

  const topRival = Array.from(opponents.entries())
    .filter(([, stats]) => stats.matches >= 2)
    .sort(([, a], [, b]) => b.matches - a.matches || Math.abs(50 - (a.wins / a.matches) * 100) - Math.abs(50 - (b.wins / b.matches) * 100))[0]

  if (topRival) {
    const [name, stats] = topRival
    moments.push({
      id: `rivalry-watch-${name.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'rivalry_watch',
      title: `Rivalry watch: ${name}`,
      body: `${displayName} and ${name} have already crossed paths ${stats.matches} times.`,
      proofLabel: `Record: ${stats.wins}-${stats.matches - stats.wins}`,
      matchId: stats.latest.match.id,
      clubId: stats.latest.match.club_id,
      clubName: stats.latest.match.clubName,
      matchDate: stats.latest.match.match_date || stats.latest.match.created_at,
      priority: 70,
    })
  }

  const bestPartner = Array.from(partners.entries())
    .filter(([, stats]) => stats.matches >= 2)
    .sort(([, a], [, b]) => (b.wins / b.matches) - (a.wins / a.matches) || b.wins - a.wins)[0]

  if (bestPartner) {
    const [name, stats] = bestPartner
    moments.push({
      id: `best-partner-${name.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'best_partner',
      title: `Best partner: ${name}`,
      body: `${displayName} and ${name} have won ${stats.wins} of ${stats.matches} doubles matches together.`,
      proofLabel: `Partnership win rate: ${Math.round((stats.wins / stats.matches) * 100)}%`,
      matchId: stats.latest.match.id,
      clubId: stats.latest.match.club_id,
      clubName: stats.latest.match.clubName,
      matchDate: stats.latest.match.match_date || stats.latest.match.created_at,
      priority: 65,
    })
  }

  if (moments.length < limit) {
    const latest = results[0]
    moments.push(createMatchMoment(
      'latest_result',
      latest,
      latest.isWin ? 'Latest win recorded' : 'Latest result recorded',
      `${displayName} ${latest.isWin ? 'won' : 'lost'} ${latest.userTeamSets}-${latest.opponentTeamSets} in ${getMatchLabel(latest.match)}.`,
      50
    ))
  }

  const seen = new Set<string>()
  return moments
    .sort((a, b) => b.priority - a.priority)
    .filter((moment) => {
      if (seen.has(moment.id)) return false
      seen.add(moment.id)
      return true
    })
    .slice(0, limit)
}

export function buildStoryMomentShareText(moment: StoryMoment, playerName: string) {
  return [
    `${playerName} on KelabSukan`,
    moment.title,
    moment.body,
    moment.proofLabel,
    moment.clubName ? `Club: ${moment.clubName}` : null,
  ].filter(Boolean).join('\n')
}
