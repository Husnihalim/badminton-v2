import { supabase } from '../supabase'
import type { 
  Competition, 
  CompetitionPool, 
  CompetitionParticipant, 
  CompetitionMatchup,
  CreateCompetitionInput,
  Friendly,
  FriendlyPair,
  FriendlyMatchup
} from '../../types/competition'

// Mapping helpers for legacy Friendly compatibility
function mapCompetitionToFriendly(comp: Competition | null | undefined): Friendly | null {
  if (!comp) return null
  return {
    ...comp,
    inviting_club_id: comp.club_id,
    invited_club_id: comp.opponent_club_id,
    invited_club_name: comp.opponent_club_name || '',
    inviting_club: comp.club,
    invited_club: comp.opponent_club,
    pair_count: comp.pair_count ?? 0,
  } as Friendly
}

function mapParticipantToFriendlyPair(part: CompetitionParticipant | null | undefined): FriendlyPair | null {
  if (!part) return null
  return {
    ...part,
    friendly_id: part.competition_id,
    pair_name: part.name,
    player_1_id: part.user_1_id || '',
    player_2_id: part.user_2_id,
    order_index: part.seed || 0,
  } as FriendlyPair
}

function mapMatchupToFriendlyMatchup(matchup: CompetitionMatchup | null | undefined): FriendlyMatchup | null {
  if (!matchup) return null
  return {
    ...matchup,
    friendly_id: matchup.competition_id,
    pair_a_id: matchup.participant_a_id,
    pair_b_id: matchup.participant_b_id,
    winner_club_id: matchup.winner_participant_id,
    pair_a: mapParticipantToFriendlyPair(matchup.participant_a) || undefined,
    pair_b: mapParticipantToFriendlyPair(matchup.participant_b) || undefined,
  } as FriendlyMatchup
}

// Helper: Generate invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Create a new competition (friendly or tournament)
export async function createCompetition(
  input: CreateCompetitionInput
): Promise<{ competition: Competition; friendly: Friendly | null; error: Error | null }> {
  const inviteCode = generateInviteCode()
  
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      club_id: input.clubId,
      opponent_club_id: input.opponentClubId || null,
      opponent_club_name: input.opponentClubName || null,
      title: input.title,
      sport: input.sport,
      format: input.format,
      pair_count: input.pairCount || null,
      rules: input.rules || null,
      start_date: input.startDate || null,
      invite_code: inviteCode,
      status: input.format === 'team_friendly' ? 'pending' : 'registration',
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select('*, club:clubs!club_id(id, name, city)')
    .single()

  if (error) {
    return { competition: null as unknown as Competition, friendly: null, error }
  }

  const mapped = mapCompetitionToFriendly(data)
  return { competition: mapped as Competition, friendly: mapped, error: null }
}

// Accept a friendly competition invitation (for opponent club)
export async function acceptCompetitionInvitation(
  inviteCode: string,
  clubId: string
): Promise<{ competition: Competition; friendly: Friendly | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitions')
    .update({
      opponent_club_id: clubId,
      status: 'accepted',
    })
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .select('*, club:clubs!club_id(id, name, city), opponent_club:clubs!opponent_club_id(id, name, city)')
    .single()

  if (error) {
    return { competition: null as unknown as Competition, friendly: null, error }
  }

  const mapped = mapCompetitionToFriendly(data)
  return { competition: mapped as Competition, friendly: mapped, error: null }
}

// Get competition by ID
export async function getCompetition(competitionId: string): Promise<{ competition: Competition | null; friendly: Friendly | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      club:clubs!club_id(id, name, city),
      opponent_club:clubs!opponent_club_id(id, name, city)
    `)
    .eq('id', competitionId)
    .single()

  const mapped = mapCompetitionToFriendly(data)
  return { competition: mapped as Competition | null, friendly: mapped, error }
}

// Get competition by invite code (e.g. for join screens)
export async function getCompetitionByInviteCode(inviteCode: string): Promise<{ competition: Competition | null; friendly: Friendly | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      club:clubs!club_id(id, name, city)
    `)
    .eq('invite_code', inviteCode)
    .single()

  const mapped = mapCompetitionToFriendly(data)
  return { competition: mapped as Competition | null, friendly: mapped, error }
}

// List competitions for a club (both hosted or invited)
export async function listClubCompetitions(clubId: string): Promise<{ competitions: Competition[]; friendlies: Friendly[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      club:clubs!club_id(id, name, city),
      opponent_club:clubs!opponent_club_id(id, name, city)
    `)
    .or(`club_id.eq.${clubId},opponent_club_id.eq.${clubId}`)
    .order('created_at', { ascending: false })

  const mapped = (data || []).map(mapCompetitionToFriendly).filter((c): c is Friendly => !!c)
  return { competitions: mapped as Competition[], friendlies: mapped, error }
}

// Register participants (players/pairs) for a competition
export async function registerCompetitionParticipants(
  competitionId: string,
  clubId: string | null,
  participants: { name?: string; pair_name?: string; player_1_id: string; player_2_id?: string | null; seed?: number }[]
): Promise<{ participants: CompetitionParticipant[]; pairs: FriendlyPair[]; error: Error | null }> {
  const participantInserts = participants.map((p) => ({
    competition_id: competitionId,
    club_id: clubId,
    name: p.name || p.pair_name || '',
    user_1_id: p.player_1_id,
    user_2_id: p.player_2_id || null,
    seed: p.seed || null
  }))

  const { data, error } = await supabase
    .from('competition_participants')
    .insert(participantInserts)
    .select(`
      *,
      player_1:profiles!user_1_id(id, name, display_name, avatar_url),
      player_2:profiles!user_2_id(id, name, display_name, avatar_url)
    `)

  const mapped = (data || []).map(mapParticipantToFriendlyPair).filter((p): p is FriendlyPair => !!p)
  return { participants: (data as CompetitionParticipant[]) || [], pairs: mapped, error }
}

// Get participants for a competition
export async function getCompetitionParticipants(competitionId: string): Promise<{ participants: CompetitionParticipant[]; pairs: FriendlyPair[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_participants')
    .select(`
      *,
      player_1:profiles!user_1_id(id, name, display_name, avatar_url),
      player_2:profiles!user_2_id(id, name, display_name, avatar_url)
    `)
    .eq('competition_id', competitionId)
    .order('seed', { nullsFirst: false })

  const mapped = (data || []).map(mapParticipantToFriendlyPair).filter((p): p is FriendlyPair => !!p)
  return { participants: (data as CompetitionParticipant[]) || [], pairs: mapped, error }
}

// Create pools for a competition
export async function createCompetitionPools(
  competitionId: string,
  poolNames: string[]
): Promise<{ pools: CompetitionPool[]; error: Error | null }> {
  const inserts = poolNames.map(name => ({
    competition_id: competitionId,
    name
  }))

  const { data, error } = await supabase
    .from('competition_pools')
    .insert(inserts)
    .select()

  return { pools: (data as CompetitionPool[]) || [], error }
}

// Get pools for a competition
export async function getCompetitionPools(competitionId: string): Promise<{ pools: CompetitionPool[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_pools')
    .select('*')
    .eq('competition_id', competitionId)

  return { pools: (data as CompetitionPool[]) || [], error }
}

// Lock matchmaking and create matchups
export async function lockCompetitionMatchups(
  competitionId: string,
  matchups: { 
    participant_a_id?: string; 
    participant_b_id?: string; 
    pair_a_id?: string; 
    pair_b_id?: string; 
    pool_id?: string | null; 
    bracket_round?: number | null; 
    bracket_position?: number | null 
  }[]
): Promise<{ matchups: CompetitionMatchup[]; error: Error | null }> {
  const matchupsWithIndex = matchups.map((m, index) => {
    const partA = m.participant_a_id || m.pair_a_id
    const partB = m.participant_b_id || m.pair_b_id
    if (!partA || !partB) {
      throw new Error('participant_a_id/pair_a_id and participant_b_id/pair_b_id are required')
    }
    return {
      competition_id: competitionId,
      pool_id: m.pool_id || null,
      participant_a_id: partA,
      participant_b_id: partB,
      bracket_round: m.bracket_round || null,
      bracket_position: m.bracket_position || null,
      order_index: index,
    }
  })

  const { data, error } = await supabase
    .from('competition_matchups')
    .insert(matchupsWithIndex)
    .select(`
      *,
      participant_a:competition_participants!participant_a_id(*, player_1:profiles!user_1_id(id, name, display_name), player_2:profiles!user_2_id(id, name, display_name)),
      participant_b:competition_participants!participant_b_id(*, player_1:profiles!user_1_id(id, name, display_name), player_2:profiles!user_2_id(id, name, display_name))
    `)

  if (error) {
    return { matchups: [], error }
  }

  // Update competition status to live
  await supabase
    .from('competitions')
    .update({ status: 'live' })
    .eq('id', competitionId)

  const mapped = (data || []).map(mapMatchupToFriendlyMatchup)
  return { matchups: mapped as CompetitionMatchup[], error: null }
}

// Get matchups for a competition
export async function getCompetitionMatchups(competitionId: string): Promise<{ matchups: CompetitionMatchup[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_matchups')
    .select(`
      *,
      participant_a:competition_participants!participant_a_id(*, player_1:profiles!user_1_id(id, name, display_name, avatar_url), player_2:profiles!user_2_id(id, name, display_name, avatar_url)),
      participant_b:competition_participants!participant_b_id(*, player_1:profiles!user_1_id(id, name, display_name, avatar_url), player_2:profiles!user_2_id(id, name, display_name, avatar_url)),
      match:matches(id, score_sets(team1_score, team2_score))
    `)
    .eq('competition_id', competitionId)
    .order('order_index')

  const mapped = (data || []).map(mapMatchupToFriendlyMatchup)
  return { matchups: mapped as CompetitionMatchup[], error }
}

// Record a match result within a competition
export async function recordCompetitionMatch(
  matchupId: string,
  matchData: {
    club_id: string
    sport: string
    match_type: 'singles' | 'doubles'
    participants: { user_id: string; team: number }[]
    score_sets: { set_number: number; team1_score: number; team2_score: number }[]
  }
): Promise<{ match: { id: string }; error: Error | null }> {
  // First create the match linked to the competition (if we can resolve tournament_id)
  const { data: matchupDetails } = await supabase
    .from('competition_matchups')
    .select('competition_id, pool_id')
    .eq('id', matchupId)
    .single()

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      club_id: matchData.club_id,
      sport: matchData.sport,
      match_type: matchData.match_type,
      recorded_by: (await supabase.auth.getUser()).data.user?.id,
      tournament_id: matchupDetails?.competition_id || null,
      tournament_pool_id: matchupDetails?.pool_id || null
    })
    .select('id')
    .single()

  if (matchError) {
    return { match: null as unknown as { id: string }, error: matchError }
  }

  // Add participants
  await supabase.from('match_participants').insert(
    matchData.participants.map(p => ({
      match_id: match.id,
      user_id: p.user_id,
      team: p.team,
    }))
  )

  // Add score sets
  await supabase.from('score_sets').insert(
    matchData.score_sets.map(s => ({
      match_id: match.id,
      set_number: s.set_number,
      team1_score: s.team1_score,
      team2_score: s.team2_score,
    }))
  )

  // Determine winner participant ID
  const team1Wins = matchData.score_sets.filter(s => s.team1_score > s.team2_score).length
  const team2Wins = matchData.score_sets.filter(s => s.team2_score > s.team1_score).length
  const winningTeam = team1Wins > team2Wins ? 1 : 2

  const { data: matchup } = await supabase
    .from('competition_matchups')
    .select('participant_a_id, participant_b_id')
    .eq('id', matchupId)
    .single()

  const winnerParticipantId = winningTeam === 1 
    ? matchup?.participant_a_id
    : matchup?.participant_b_id

  await supabase
    .from('competition_matchups')
    .update({
      match_id: match.id,
      status: 'completed',
      winner_participant_id: winnerParticipantId,
    })
    .eq('id', matchupId)

  return { match: { id: match.id }, error: null }
}

// Complete a competition (calculate winner)
export async function completeCompetition(competitionId: string): Promise<{ competition: Competition; friendly: Friendly | null; error: Error | null }> {
  const { data: matchups } = await supabase
    .from('competition_matchups')
    .select('winner_participant_id, participant_a_id, participant_b_id, participant_a:competition_participants!participant_a_id(club_id), participant_b:competition_participants!participant_b_id(club_id)')
    .eq('competition_id', competitionId)
    .eq('status', 'completed')

  const { data: compDetails } = await supabase
    .from('competitions')
    .select('format, club_id, opponent_club_id')
    .eq('id', competitionId)
    .single()

  let winningClubId: string | null = null
  let winnerParticipantId: string | null = null

  const getClubIdHelper = (participant: unknown) => {
    if (!participant) return null
    if (Array.isArray(participant)) return (participant[0] as { club_id: string })?.club_id || null
    return (participant as { club_id: string }).club_id || null
  }

  if (compDetails?.format === 'team_friendly') {
    // Count club wins
    const clubWins: Record<string, number> = {}
    matchups?.forEach(m => {
      const pAClubId = getClubIdHelper(m.participant_a)
      const pBClubId = getClubIdHelper(m.participant_b)
      const winnerClub = m.winner_participant_id === m.participant_a_id 
        ? pAClubId
        : pBClubId
      if (winnerClub) {
        clubWins[winnerClub] = (clubWins[winnerClub] || 0) + 1
      }
    })
    winningClubId = Object.entries(clubWins).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  } else {
    // For tournaments: find the winner of the final round or set it directly
    winnerParticipantId = matchups?.[matchups.length - 1]?.winner_participant_id || null
  }

  const { data, error } = await supabase
    .from('competitions')
    .update({
      status: 'completed',
      winning_club_id: winningClubId,
      winner_participant_id: winnerParticipantId,
    })
    .eq('id', competitionId)
    .select('*, club:clubs!club_id(id, name, city), opponent_club:clubs!opponent_club_id(id, name, city)')
    .single()

  const mapped = mapCompetitionToFriendly(data)
  return { competition: mapped as Competition, friendly: mapped, error }
}

// Decline a friendly competition invitation
export async function declineCompetitionInvitation(inviteCode: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('competitions')
    .update({ status: 'declined' })
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')

  return { error }
}

// Cancel a competition
export async function cancelCompetition(competitionId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('competitions')
    .update({ status: 'cancelled' })
    .eq('id', competitionId)

  return { error }
}

// Get competition statistics for a club (only filters formats of 'team_friendly')
export async function getClubCompetitionStats(clubId: string): Promise<{
  total: number
  wins: number
  losses: number
  winRate: number
  error: Error | null
}> {
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('winning_club_id, club_id, opponent_club_id')
    .eq('status', 'completed')
    .eq('format', 'team_friendly')
    .or(`club_id.eq.${clubId},opponent_club_id.eq.${clubId}`)

  if (error) {
    return { total: 0, wins: 0, losses: 0, winRate: 0, error }
  }

  const total = competitions?.length || 0
  const wins = competitions?.filter(c => c.winning_club_id === clubId).length || 0
  const losses = total - wins
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  return { total, wins, losses, winRate, error: null }
}

// Realtime subscriptions
export function subscribeToCompetition(competitionId: string, callback: (payload: { new: Competition }) => void) {
  return supabase
    .channel(`competition:${competitionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'competitions',
        filter: `id=eq.${competitionId}`,
      },
      (payload) => callback(payload as unknown as { new: Competition })
    )
    .subscribe()
}

export function subscribeToCompetitionMatchups(competitionId: string, callback: (payload: { new: CompetitionMatchup }) => void) {
  return supabase
    .channel(`competition-matchups:${competitionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'competition_matchups',
        filter: `competition_id=eq.${competitionId}`,
      },
      (payload) => callback(payload as unknown as { new: CompetitionMatchup })
    )
    .subscribe()
}

// ============================================
// BACKWARD COMPATIBILITY ALIASES FOR WEEK 1
// ============================================
export async function createFriendly(
  invitingClubId: string,
  invitedClubName: string,
  pairCount: number = 5,
  invitedContact?: string,
  invitedClubId?: string
): Promise<{ friendly: Friendly | null; error: Error | null }> {
  const result = await createCompetition({
    clubId: invitingClubId,
    title: `${invitedClubName} Friendly`,
    sport: 'badminton',
    format: 'team_friendly',
    opponentClubName: invitedClubName,
    opponentClubId: invitedClubId,
    pairCount,
  })
  return { friendly: result.friendly, error: result.error }
}

export {
  acceptCompetitionInvitation as acceptFriendly,
  getCompetition as getFriendly,
  getCompetitionByInviteCode as getFriendlyByInviteCode,
  listClubCompetitions as listClubFriendlies,
  registerCompetitionParticipants as registerPairs,
  getCompetitionParticipants as getFriendlyPairs,
  lockCompetitionMatchups as lockMatchmaking,
  getCompetitionMatchups as getFriendlyMatchups,
  recordCompetitionMatch as recordFriendlyMatch,
  completeCompetition as completeFriendly,
  declineCompetitionInvitation as declineFriendly,
  cancelCompetition as cancelFriendly,
  getClubCompetitionStats as getClubFriendlyStats,
  subscribeToCompetition as subscribeToFriendly,
  subscribeToCompetitionMatchups as subscribeToMatchups
}

