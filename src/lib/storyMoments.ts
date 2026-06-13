import type { MatchParticipant, MatchWithDetails, User } from '../types'
import type { Competition, CompetitionMatchup } from '../types/competition'

export type CompetitionStoryType =
  | 'competition_invited'
  | 'competition_accepted'
  | 'matchmaking_complete'
  | 'upset_alert'
  | 'clutch_moment'
  | 'comeback_in_progress'
  | 'competition_completed'
  | 'sweep_victory'
  | 'narrow_escape'
  | 'upset_victory'
  | 'rivalry_formed'

export type StoryMomentType =
  | 'win_streak'
  | 'response_needed'
  | 'comeback_win'
  | 'clean_sweep'
  | 'close_match'
  | 'rivalry_watch'
  | 'best_partner'
  | 'latest_result'
  | CompetitionStoryType

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
  competitionId?: string
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

// ============================================
// COMPETITIONS STORY ENGINE
// ============================================

const competitionStoryTemplates: Record<CompetitionStoryType, string[]> = {
  competition_invited: [
    "{inviting_club} threw down the gauntlet. {opponent_club} has been challenged.",
    "{inviting_club} thinks they own Friday night. {opponent_club} gets to disagree.",
    "The group chat has been waiting for this. {inviting_club} vs {opponent_club}.",
    "{inviting_club} woke up and chose violence. {opponent_club} is the target.",
  ],
  competition_accepted: [
    "{opponent_club} answered the call. The friendly is on.",
    "{opponent_club} said yes. Now they have to back it up.",
    "Challenge accepted. {opponent_club} isn't backing down.",
    "{opponent_club} walked into the trap. Let's see if they walk out.",
  ],
  matchmaking_complete: [
    "The battles are set. May the best pairs win.",
    "Matchmaking locked. No take-backs.",
    "The matchups are spicy. This was intentional.",
    "Captains have spoken. The dice are cast.",
  ],
  upset_alert: [
    "The scoreboard just got interesting. {winning_pair} weren't supposed to win this.",
    "{losing_pair} had this in their pocket. Then they didn't.",
    "Upset of the night: {winning_pair} send {losing_pair} home early.",
    "Nobody saw this coming. {winning_pair} just changed everything.",
  ],
  clutch_moment: [
    "Final match decides it. The pressure is real.",
    "It all comes down to this. Nerves of steel required.",
    "The last dance. Winner takes all.",
    "This is why we play. Final match, everything on the line.",
  ],
  comeback_in_progress: [
    "{club} was down {deficit}. Now it's tied. Momentum is a funny thing.",
    "The comeback is live. {club} refuses to go quietly.",
    "From the ashes. {club} is one win away from completing the impossible.",
    "Remember when {club} was losing? They don't either.",
  ],
  competition_completed: [
    "{winning_club} takes the friendly. The dinner conversation just got one-sided.",
    "{losing_club} came close. Close doesn't get you bragging rights.",
    "{winning_club} owns this round. The rematch request is already in the group chat.",
    "It's done. {winning_club} will be insufferable for at least a week.",
  ],
  sweep_victory: [
    "{winning_club} didn't just win. They made a statement. {score}.",
    "Dominant. {winning_club} gave {losing_club} no room to breathe.",
    "A masterclass from {winning_club}. {losing_club} couldn't find an answer.",
    "Perfect night for {winning_club}. {losing_club} will want to forget this one.",
  ],
  narrow_escape: [
    "{winning_club} edged it out. One point either way and we're telling a different story.",
    "Heartstopper. {winning_club} survived by the thinnest margin.",
    "{losing_club} will replay that final point for weeks. {winning_club} moves on.",
    "Could have gone either way. {winning_club} will take it.",
  ],
  upset_victory: [
    "The underdogs did it. {winning_club} just shocked everyone.",
    "David met Goliath. David won. {winning_club} is living the dream.",
    "Nobody believed in {winning_club}. They believed in themselves. That's enough.",
    "The impossible happened. {winning_club} will never forget this night.",
  ],
  rivalry_formed: [
    "This isn't over. {club_a} and {club_b} have unfinished business.",
    "A rivalry is born. {club_a} vs {club_b} just became must-watch.",
    "They'll meet again. {club_a} and {club_b} are now tied at {wins}-{losses}.",
    "The rematch is already being discussed. {club_a} vs {club_b} is now a thing.",
  ],
}

// Invitation / Registration Story
export function generateCompetitionInvitedStory(competition: Competition): StoryMoment {
  const templates = competitionStoryTemplates.competition_invited
  const template = templates[Math.floor(Math.random() * templates.length)]
  const hostName = competition.club?.name || 'Host Club'
  const oppName = competition.opponent_club?.name || competition.opponent_club_name || 'Opponent'

  return {
    id: `invited-${competition.id}`,
    type: 'competition_invited',
    title: competition.format === 'team_friendly' ? 'Challenge Thrown' : 'Competition Created',
    body: competition.format === 'team_friendly'
      ? template.replace('{inviting_club}', hostName).replace('{opponent_club}', oppName)
      : `Registration is officially open for '${competition.title}'!`,
    proofLabel: `Format: ${competition.format.replace('_', ' ')}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 80,
  }
}

// Accept / Signups Closed Story
export function generateCompetitionAcceptedStory(competition: Competition): StoryMoment {
  const templates = competitionStoryTemplates.competition_accepted
  const template = templates[Math.floor(Math.random() * templates.length)]
  const oppName = competition.opponent_club?.name || competition.opponent_club_name || 'Opponent'

  return {
    id: `accepted-${competition.id}`,
    type: 'competition_accepted',
    title: competition.format === 'team_friendly' ? 'Challenge Accepted' : 'Signups Complete',
    body: competition.format === 'team_friendly'
      ? template.replace('{opponent_club}', oppName)
      : `Roster locked. Matchmaking is now in progress for '${competition.title}'.`,
    proofLabel: `Status: ${competition.status}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 85,
  }
}

// Matchmaking Locked Story
export function generateCompetitionMatchmakingCompleteStory(competition: Competition): StoryMoment {
  const templates = competitionStoryTemplates.matchmaking_complete
  const template = templates[Math.floor(Math.random() * templates.length)]

  return {
    id: `matchmaking-${competition.id}`,
    type: 'matchmaking_complete',
    title: 'The Battles Are Set',
    body: template,
    proofLabel: `Status: matchmaking locked`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 70,
  }
}

// Upset Alert Story
export function generateCompetitionUpsetAlertStory(
  competition: Competition,
  matchup: CompetitionMatchup,
  scoreA: number,
  scoreB: number
): StoryMoment | null {
  const isAWinning = scoreA > scoreB
  const isUpset = (isAWinning && scoreB > scoreA) || (!isAWinning && scoreA > scoreB)

  if (!isUpset) return null

  const templates = competitionStoryTemplates.upset_alert
  const template = templates[Math.floor(Math.random() * templates.length)]

  const winningPair = matchup.winner_participant_id === matchup.participant_a_id
    ? matchup.participant_a?.name
    : matchup.participant_b?.name

  const losingPair = matchup.winner_participant_id === matchup.participant_a_id
    ? matchup.participant_b?.name
    : matchup.participant_a?.name

  return {
    id: `upset-${matchup.id}`,
    type: 'upset_alert',
    title: 'Upset Alert',
    body: template
      .replace('{winning_pair}', winningPair || 'The underdogs')
      .replace('{losing_pair}', losingPair || 'The favorites'),
    proofLabel: `Match index: ${matchup.order_index + 1}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 95,
  }
}

// Clutch Moment Story
export function generateCompetitionClutchMomentStory(
  competition: Competition,
  scoreA: number,
  scoreB: number,
  matchesRemaining: number
): StoryMoment | null {
  if (matchesRemaining !== 1 || Math.abs(scoreA - scoreB) !== 0) {
    return null
  }

  const templates = competitionStoryTemplates.clutch_moment
  const template = templates[Math.floor(Math.random() * templates.length)]

  return {
    id: `clutch-${competition.id}-${scoreA + scoreB}`,
    type: 'clutch_moment',
    title: 'It All Comes Down To This',
    body: template,
    proofLabel: `Series Tied: ${scoreA}-${scoreB}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 100,
  }
}

// Comeback Story
export function generateCompetitionComebackStory(
  competition: Competition,
  scoreA: number,
  scoreB: number,
  scoreHistory: { scoreA: number; scoreB: number }[]
): StoryMoment | null {
  if (scoreHistory.length < 3) return null

  const currentLeader = scoreA > scoreB ? 'A' : 'B'
  const wasBehind = scoreHistory.slice(0, -1).some(
    s => currentLeader === 'A' ? s.scoreA < s.scoreB : s.scoreB < s.scoreA
  )

  if (!wasBehind) return null

  const templates = competitionStoryTemplates.comeback_in_progress
  const template = templates[Math.floor(Math.random() * templates.length)]

  const comebackClub = currentLeader === 'A'
    ? competition.club?.name
    : competition.opponent_club?.name || competition.opponent_club_name || 'Opponent'

  const maxDeficit = Math.max(...scoreHistory.map(s => 
    currentLeader === 'A' ? s.scoreB - s.scoreA : s.scoreA - s.scoreB
  ))

  return {
    id: `comeback-${competition.id}`,
    type: 'comeback_in_progress',
    title: 'The Comeback Is Real',
    body: template
      .replace('{club}', comebackClub || 'The comeback side')
      .replace('{deficit}', `${maxDeficit}-0`),
    proofLabel: `Deficit overcame: ${maxDeficit}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 90,
  }
}

// Competition Completed Story
export function generateCompetitionCompletedStory(
  competition: Competition,
  matchups: CompetitionMatchup[]
): StoryMoment {
  const hostWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_a_id === m.winner_participant_id
  ).length
  const oppWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_b_id === m.winner_participant_id
  ).length

  const hostName = competition.club?.name || 'Host'
  const oppName = competition.opponent_club?.name || competition.opponent_club_name || 'Opponent'

  const winningClub = hostWins > oppWins ? hostName : oppName
  const losingClub = hostWins > oppWins ? oppName : hostName
  const winningScore = Math.max(hostWins, oppWins)
  const losingScore = Math.min(hostWins, oppWins)

  let storyType: CompetitionStoryType = 'competition_completed'
  let title = 'Competition Complete'

  if (winningScore === matchups.length) {
    storyType = 'sweep_victory'
    title = 'Sweep Victory'
  } else if (winningScore === losingScore + 1) {
    storyType = 'narrow_escape'
    title = 'Narrow Escape'
  }

  const templates = competitionStoryTemplates[storyType]
  const template = templates[Math.floor(Math.random() * templates.length)]

  return {
    id: `completed-${competition.id}`,
    type: storyType,
    title,
    body: template
      .replace('{winning_club}', winningClub)
      .replace('{losing_club}', losingClub)
      .replace('{score}', `${winningScore}-${losingScore}`),
    proofLabel: `Final Score: ${winningScore}-${losingScore}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 100,
  }
}

// Generate all stories for a competition based on current state
export function generateCompetitionStories(
  competition: Competition,
  matchups: CompetitionMatchup[],
  scoreHistory?: { scoreA: number; scoreB: number }[]
): StoryMoment[] {
  const stories: StoryMoment[] = []

  // 1. Invitation / Creation
  stories.push(generateCompetitionInvitedStory(competition))

  // 2. Acceptance / Registration complete
  if (competition.status !== 'pending' && competition.status !== 'declined' && competition.status !== 'cancelled') {
    stories.push(generateCompetitionAcceptedStory(competition))
  }

  // 3. Matchmaking Locked
  if (matchups.length > 0) {
    stories.push(generateCompetitionMatchmakingCompleteStory(competition))
  }

  // Calculate scores
  const scoreA = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_a_id === m.winner_participant_id
  ).length
  const scoreB = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_b_id === m.winner_participant_id
  ).length
  const completedCount = scoreA + scoreB
  const remainingCount = matchups.length - completedCount

  // 4. Check for upsets
  matchups.forEach(matchup => {
    if (matchup.status === 'completed') {
      const upsetStory = generateCompetitionUpsetAlertStory(competition, matchup, scoreA, scoreB)
      if (upsetStory) stories.push(upsetStory)
    }
  })

  // 5. Clutch Moment
  const clutchStory = generateCompetitionClutchMomentStory(competition, scoreA, scoreB, remainingCount)
  if (clutchStory) stories.push(clutchStory)

  // 6. Comeback
  if (scoreHistory && scoreHistory.length > 0) {
    const comebackStory = generateCompetitionComebackStory(competition, scoreA, scoreB, scoreHistory)
    if (comebackStory) stories.push(comebackStory)
  }

  // 7. Completion
  if (competition.status === 'completed') {
    stories.push(generateCompetitionCompletedStory(competition, matchups))
  }

  return stories.sort((a, b) => b.priority - a.priority)
}

// Build share text for a competition
export function buildCompetitionShareText(
  competition: Competition,
  matchups: CompetitionMatchup[],
  story?: StoryMoment
): string {
  const hostWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_a_id === m.winner_participant_id
  ).length
  const oppWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_b_id === m.winner_participant_id
  ).length

  const hostName = competition.club?.name || 'Host'
  const oppName = competition.opponent_club?.name || competition.opponent_club_name || 'Opponent'

  const isComplete = competition.status === 'completed'
  const isLive = competition.status === 'live'

  let text: string

  if (competition.format === 'team_friendly') {
    if (isComplete) {
      const winner = hostWins > oppWins ? hostName : oppName
      text = `${hostName} ${hostWins}-${oppWins} ${oppName}\n\n${winner} wins the friendly!`
    } else if (isLive) {
      text = `${hostName} ${hostWins}-${oppWins} ${oppName} — LIVE!\n\n${matchups.length - hostWins - oppWins} matchups remain.`
    } else {
      text = `${hostName} vs ${oppName}\n\nFriendly challenge pending.`
    }
  } else {
    if (isComplete) {
      text = `${competition.title} — Completed!\n\nMatches played: ${matchups.length}`
    } else if (isLive) {
      text = `${competition.title} — LIVE!\n\nMatches played: ${hostWins + oppWins} / ${matchups.length}`
    } else {
      text = `${competition.title}\n\nTournament registrations open.`
    }
  }

  if (story) {
    text += `\n\n${story.title}: ${story.body}`
  }

  text += `\n\nLink: ${window.location.origin}/competitions/${competition.id}`

  return text
}

// ============================================
// BACKWARD COMPATIBILITY FOR FRIENDLY STORIES
// ============================================

export type FriendlyStoryType =
  | 'friendly_invited'
  | 'friendly_accepted'
  | 'matchmaking_complete'
  | 'upset_alert'
  | 'clutch_moment'
  | 'comeback_in_progress'
  | 'friendly_completed'
  | 'sweep_victory'
  | 'narrow_escape'
  | 'upset_victory'
  | 'rivalry_formed'

export interface FriendlyStoryMoment {
  id: string
  type: FriendlyStoryType
  friendly_id: string
  title: string
  body: string
  proof?: string
  priority: number
  created_at: string
}

export function generateFriendlyStories(
  friendly: Competition,
  matchups: CompetitionMatchup[],
  scoreHistory?: { inviting: number; invited: number }[]
): FriendlyStoryMoment[] {
  const mappedScoreHistory = scoreHistory?.map((h) => ({
    scoreA: h.inviting,
    scoreB: h.invited,
  }))

  const compStories = generateCompetitionStories(friendly, matchups, mappedScoreHistory)

  return compStories.map((story) => {
    let type = story.type as string
    if (type === 'competition_invited') type = 'friendly_invited'
    if (type === 'competition_accepted') type = 'friendly_accepted'
    if (type === 'competition_completed') type = 'friendly_completed'

    return {
      id: story.id,
      type: type as FriendlyStoryType,
      friendly_id: friendly.id,
      title: story.title,
      body: story.body,
      proof: story.proofLabel,
      priority: story.priority,
      created_at: story.matchDate || new Date().toISOString(),
    } as FriendlyStoryMoment
  })
}

export function buildFriendlyShareText(
  friendly: Competition,
  matchups: CompetitionMatchup[],
  story?: FriendlyStoryMoment
): string {
  let compStory: StoryMoment | undefined
  if (story) {
    let type = story.type as string
    if (type === 'friendly_invited') type = 'competition_invited'
    if (type === 'friendly_accepted') type = 'competition_accepted'
    if (type === 'friendly_completed') type = 'competition_completed'

    compStory = {
      id: story.id,
      type: type as StoryMomentType,
      title: story.title,
      body: story.body,
      proofLabel: story.proof || '',
      priority: story.priority,
    }
  }

  const text = buildCompetitionShareText(friendly, matchups, compStory)
  return text.replace(`/competitions/${friendly.id}`, `/friendly/${friendly.id}`)
}

