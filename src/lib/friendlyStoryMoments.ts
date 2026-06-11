import type { Friendly, FriendlyMatchup } from '../types/friendly'

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

// Story templates with playful, fictionalized tone
const storyTemplates: Record<FriendlyStoryType, string[]> = {
  friendly_invited: [
    "{inviting_club} threw down the gauntlet. {invited_club} has been challenged.",
    "{inviting_club} thinks they own Friday night. {invited_club} gets to disagree.",
    "The group chat has been waiting for this. {inviting_club} vs {invited_club}.",
    "{inviting_club} woke up and chose violence. {invited_club} is the target.",
  ],
  friendly_accepted: [
    "{invited_club} answered the call. The friendly is on.",
    "{invited_club} said yes. Now they have to back it up.",
    "Challenge accepted. {invited_club} isn't backing down.",
    "{invited_club} walked into the trap. Let's see if they walk out.",
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
  friendly_completed: [
    "{winning_club} takes the friendly. The dinner conversation just got one-sided.",
    "{losing_club} came close. Close doesn't get you bragging rights.",
    "{winning_club} owns this round. The rematch request is already in the group chat.",
    "It's done. {winning_club} will be insufferable for at least a week.",
  ],
  sweep_victory: [
    "{winning_club} didn't just win. They made a statement. {score}-0.",
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

// Generate a story moment for friendly invitation
export function generateFriendlyInvitedStory(
  friendly: Friendly
): FriendlyStoryMoment {
  const templates = storyTemplates.friendly_invited
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  return {
    id: `invited-${friendly.id}`,
    type: 'friendly_invited',
    friendly_id: friendly.id,
    title: 'Challenge Thrown',
    body: template
      .replace('{inviting_club}', friendly.inviting_club?.name || 'A club')
      .replace('{invited_club}', friendly.invited_club_name),
    priority: 80,
    created_at: new Date().toISOString(),
  }
}

// Generate a story moment for friendly acceptance
export function generateFriendlyAcceptedStory(
  friendly: Friendly
): FriendlyStoryMoment {
  const templates = storyTemplates.friendly_accepted
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  return {
    id: `accepted-${friendly.id}`,
    type: 'friendly_accepted',
    friendly_id: friendly.id,
    title: 'Challenge Accepted',
    body: template
      .replace('{invited_club}', friendly.invited_club?.name || friendly.invited_club_name),
    priority: 85,
    created_at: new Date().toISOString(),
  }
}

// Generate a story moment for matchmaking completion
export function generateMatchmakingCompleteStory(
  friendly: Friendly
): FriendlyStoryMoment {
  const templates = storyTemplates.matchmaking_complete
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  return {
    id: `matchmaking-${friendly.id}`,
    type: 'matchmaking_complete',
    friendly_id: friendly.id,
    title: 'The Battles Are Set',
    body: template,
    priority: 70,
    created_at: new Date().toISOString(),
  }
}

// Generate a story moment for an upset
export function generateUpsetAlertStory(
  friendly: Friendly,
  matchup: FriendlyMatchup,
  invitingClubScore: number,
  invitedClubScore: number
): FriendlyStoryMoment | null {
  // Determine if this is an upset based on score progression
  const isInvitingClubWinning = invitingClubScore > invitedClubScore

  
  // Simple upset detection: if the losing club was ahead in the series
  const isUpset = (isInvitingClubWinning && invitedClubScore > invitingClubScore) ||
                  (!isInvitingClubWinning && invitingClubScore > invitedClubScore)
  
  if (!isUpset) return null
  
  const templates = storyTemplates.upset_alert
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  const winningPair = matchup.winner_club_id === matchup.pair_a?.club_id
    ? matchup.pair_a?.pair_name
    : matchup.pair_b?.pair_name
  
  const losingPair = matchup.winner_club_id === matchup.pair_a?.club_id
    ? matchup.pair_b?.pair_name
    : matchup.pair_a?.pair_name
  
  return {
    id: `upset-${matchup.id}`,
    type: 'upset_alert',
    friendly_id: friendly.id,
    title: 'Upset Alert',
    body: template
      .replace('{winning_pair}', winningPair || 'The underdogs')
      .replace('{losing_pair}', losingPair || 'The favorites'),
    proof: `Match ${matchup.order_index + 1}`,
    priority: 95,
    created_at: new Date().toISOString(),
  }
}

// Generate a story moment for clutch moment (final match deciding)
export function generateClutchMomentStory(
  friendly: Friendly,
  invitingClubScore: number,
  invitedClubScore: number,
  matchesRemaining: number
): FriendlyStoryMoment | null {
  // Only generate if it's the final match or very close

  const matchesPlayed = invitingClubScore + invitedClubScore
  
  if (matchesRemaining !== 1 || Math.abs(invitingClubScore - invitedClubScore) !== 0) {
    return null
  }
  
  const templates = storyTemplates.clutch_moment
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  return {
    id: `clutch-${friendly.id}-${matchesPlayed}`,
    type: 'clutch_moment',
    friendly_id: friendly.id,
    title: 'It All Comes Down To This',
    body: template,
    priority: 100,
    created_at: new Date().toISOString(),
  }
}

// Generate a story moment for comeback
export function generateComebackStory(
  friendly: Friendly,
  invitingClubScore: number,
  invitedClubScore: number,
  scoreHistory: { inviting: number; invited: number }[]
): FriendlyStoryMoment | null {
  // Check if there was a comeback
  if (scoreHistory.length < 3) return null
  
  const currentLeader = invitingClubScore > invitedClubScore ? 'inviting' : 'invited'
  const wasBehind = scoreHistory.slice(0, -1).some(
    s => currentLeader === 'inviting' ? s.inviting < s.invited : s.invited < s.inviting
  )
  
  if (!wasBehind) return null
  
  const templates = storyTemplates.comeback_in_progress
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  const comebackClub = currentLeader === 'inviting'
    ? friendly.inviting_club?.name
    : friendly.invited_club?.name || friendly.invited_club_name
  
  const maxDeficit = Math.max(...scoreHistory.map(s => 
    currentLeader === 'inviting' ? s.invited - s.inviting : s.inviting - s.invited
  ))
  
  return {
    id: `comeback-${friendly.id}`,
    type: 'comeback_in_progress',
    friendly_id: friendly.id,
    title: 'The Comeback Is Real',
    body: template
      .replace('{club}', comebackClub || 'The comeback club')
      .replace('{deficit}', `${maxDeficit}-0`),
    priority: 90,
    created_at: new Date().toISOString(),
  }
}

// Generate a story moment for friendly completion
export function generateFriendlyCompletedStory(
  friendly: Friendly
): FriendlyStoryMoment {
  const winningClub = friendly.winning_club_id === friendly.inviting_club_id
    ? friendly.inviting_club?.name
    : friendly.invited_club?.name || friendly.invited_club_name
  
  const losingClub = friendly.winning_club_id === friendly.inviting_club_id
    ? friendly.invited_club?.name || friendly.invited_club_name
    : friendly.inviting_club?.name
  
  // Determine margin for story type

  const winningScore = friendly.winning_club_id === friendly.inviting_club_id ? 1 : 0 // Placeholder
  const losingScore = friendly.pair_count - winningScore
  
  let storyType: FriendlyStoryType = 'friendly_completed'
  let title = 'Friendly Complete'
  
  if (winningScore === friendly.pair_count) {
    storyType = 'sweep_victory'
    title = 'Sweep Victory'
  } else if (winningScore === losingScore + 1) {
    storyType = 'narrow_escape'
    title = 'Narrow Escape'
  }
  
  const templates = storyTemplates[storyType]
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  return {
    id: `completed-${friendly.id}`,
    type: storyType,
    friendly_id: friendly.id,
    title,
    body: template
      .replace('{winning_club}', winningClub || 'Winner')
      .replace('{losing_club}', losingClub || 'Loser')
      .replace('{score}', `${winningScore}-${losingScore}`),
    priority: 100,
    created_at: new Date().toISOString(),
  }
}

// Generate all stories for a friendly based on current state
export function generateFriendlyStories(
  friendly: Friendly,
  matchups: FriendlyMatchup[],
  scoreHistory?: { inviting: number; invited: number }[]
): FriendlyStoryMoment[] {
  const stories: FriendlyStoryMoment[] = []
  
  // Always include invitation story
  stories.push(generateFriendlyInvitedStory(friendly))
  
  // Include acceptance if accepted
  if (friendly.status !== 'pending' && friendly.status !== 'declined' && friendly.status !== 'cancelled') {
    stories.push(generateFriendlyAcceptedStory(friendly))
  }
  
  // Include matchmaking if locked
  if (matchups.length > 0) {
    stories.push(generateMatchmakingCompleteStory(friendly))
  }
  
  // Calculate current scores
  const invitingClubWins = matchups.filter(
    m => m.status === 'completed' && m.winner_club_id === friendly.inviting_club_id
  ).length
  const invitedClubWins = matchups.filter(
    m => m.status === 'completed' && m.winner_club_id === friendly.invited_club_id
  ).length
  const completedMatches = invitingClubWins + invitedClubWins
  const remainingMatches = friendly.pair_count - completedMatches
  
  // Check for upsets in completed matches
  matchups.forEach(matchup => {
    if (matchup.status === 'completed') {
      const upsetStory = generateUpsetAlertStory(
        friendly,
        matchup,
        invitingClubWins,
        invitedClubWins
      )
      if (upsetStory) stories.push(upsetStory)
    }
  })
  
  // Check for clutch moment
  const clutchStory = generateClutchMomentStory(
    friendly,
    invitingClubWins,
    invitedClubWins,
    remainingMatches
  )
  if (clutchStory) stories.push(clutchStory)
  
  // Check for comeback
  if (scoreHistory && scoreHistory.length > 0) {
    const comebackStory = generateComebackStory(
      friendly,
      invitingClubWins,
      invitedClubWins,
      scoreHistory
    )
    if (comebackStory) stories.push(comebackStory)
  }
  
  // Include completion if completed
  if (friendly.status === 'completed') {
    stories.push(generateFriendlyCompletedStory(friendly))
  }
  
  // Sort by priority (highest first)
  return stories.sort((a, b) => b.priority - a.priority)
}

// Build share text for a friendly
export function buildFriendlyShareText(
  friendly: Friendly,
  matchups: FriendlyMatchup[],
  story?: FriendlyStoryMoment
): string {
  const invitingClubWins = matchups.filter(
    m => m.status === 'completed' && m.winner_club_id === friendly.inviting_club_id
  ).length
  const invitedClubWins = matchups.filter(
    m => m.status === 'completed' && m.winner_club_id === friendly.invited_club_id
  ).length
  
  const isComplete = friendly.status === 'completed'
  const isLive = friendly.status === 'live'
  
  let text: string
  
  if (isComplete) {
    const winner = friendly.winning_club_id === friendly.inviting_club_id
      ? friendly.inviting_club?.name
      : friendly.invited_club?.name || friendly.invited_club_name
    
    text = `${friendly.inviting_club?.name} ${invitingClubWins}-${invitedClubWins} ${friendly.invited_club?.name || friendly.invited_club_name}\n\n${winner} takes the friendly!`
  } else if (isLive) {
    text = `${friendly.inviting_club?.name} ${invitingClubWins}-${invitedClubWins} ${friendly.invited_club?.name || friendly.invited_club_name} — LIVE!\n\n${friendly.pair_count - invitingClubWins - invitedClubWins} matches remain.`
  } else {
    text = `${friendly.inviting_club?.name} vs ${friendly.invited_club?.name || friendly.invited_club_name}\n\nFriendly challenge pending.`
  }
  
  if (story) {
    text += `\n\n${story.title}: ${story.body}`
  }
  
  text += `\n\n${window.location.origin}/friendly/${friendly.id}`
  
  return text
}
