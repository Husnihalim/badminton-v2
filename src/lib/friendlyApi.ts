import { supabase } from './supabase'
import type { Database } from '../types/database'

// Types
export type FriendlyStatus = 'pending' | 'accepted' | 'matchmaking' | 'live' | 'completed' | 'declined' | 'cancelled'
export type MatchupStatus = 'pending' | 'live' | 'completed'

export interface Friendly {
  id: string
  inviting_club_id: string
  invited_club_id: string | null
  invited_club_name: string
  invited_contact: string | null
  status: FriendlyStatus
  pair_count: number
  winning_club_id: string | null
  created_by: string
  created_at: string
  accepted_at: string | null
  matchmaking_locked_at: string | null
  completed_at: string | null
  invite_code: string
  // Joined fields
  inviting_club?: { id: string; name: string; city: string }
  invited_club?: { id: string; name: string; city: string } | null
}

export interface FriendlyPair {
  id: string
  friendly_id: string
  club_id: string
  pair_name: string
  player_1_id: string
  player_2_id: string | null
  order_index: number
  created_at: string
  // Joined fields
  player_1?: { id: string; name: string; display_name: string | null; avatar_url: string | null }
  player_2?: { id: string; name: string; display_name: string | null; avatar_url: string | null } | null
}

export interface FriendlyMatchup {
  id: string
  friendly_id: string
  pair_a_id: string
  pair_b_id: string
  match_id: string | null
  order_index: number
  status: MatchupStatus
  winner_club_id: string | null
  created_at: string
  // Joined fields
  pair_a?: FriendlyPair
  pair_b?: FriendlyPair
  match?: { id: string; score_sets: { team1_score: number; team2_score: number }[] }
}

// Helper: Generate invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Create a new friendly
export async function createFriendly(
  invitingClubId: string,
  invitedClubName: string,
  pairCount: number = 5,
  invitedContact?: string,
  invitedClubId?: string
): Promise<{ friendly: Friendly; error: Error | null }> {
  const inviteCode = generateInviteCode()
  
  const { data, error } = await supabase
    .from('friendlies')
    .insert({
      inviting_club_id: invitingClubId,
      invited_club_id: invitedClubId || null,
      invited_club_name: invitedClubName,
      invited_contact: invitedContact || null,
      pair_count: pairCount,
      invite_code: inviteCode,
    })
    .select('*, inviting_club:clubs!inviting_club_id(id, name, city)')
    .single()

  if (error) {
    return { friendly: null as unknown as Friendly, error }
  }

  // Track invite
  await supabase.from('friendly_invites').insert({
    friendly_id: data.id,
    invite_method: invitedContact ? 'whatsapp' : 'link',
    invited_contact: invitedContact,
  })

  return { friendly: data as Friendly, error: null }
}

// Accept a friendly (for existing clubs)
export async function acceptFriendly(
  inviteCode: string,
  clubId: string
): Promise<{ friendly: Friendly; error: Error | null }> {
  const { data, error } = await supabase
    .from('friendlies')
    .update({
      invited_club_id: clubId,
      status: 'accepted',
    })
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .select('*, inviting_club:clubs!inviting_club_id(id, name, city), invited_club:clubs!invited_club_id(id, name, city)')
    .single()

  if (error) {
    return { friendly: null as unknown as Friendly, error }
  }

  // Update invite tracking
  await supabase
    .from('friendly_invites')
    .update({ status: 'converted', converted_at: new Date().toISOString() })
    .eq('friendly_id', data.id)

  return { friendly: data as Friendly, error: null }
}

// Get friendly by ID
export async function getFriendly(friendlyId: string): Promise<{ friendly: Friendly | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('friendlies')
    .select(`
      *,
      inviting_club:clubs!inviting_club_id(id, name, city),
      invited_club:clubs!invited_club_id(id, name, city)
    `)
    .eq('id', friendlyId)
    .single()

  return { friendly: data as Friendly | null, error }
}

// Get friendly by invite code (for landing page)
export async function getFriendlyByInviteCode(inviteCode: string): Promise<{ friendly: Friendly | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('friendlies')
    .select(`
      *,
      inviting_club:clubs!inviting_club_id(id, name, city)
    `)
    .eq('invite_code', inviteCode)
    .single()

  return { friendly: data as Friendly | null, error }
}

// List friendlies for a club
export async function listClubFriendlies(clubId: string): Promise<{ friendlies: Friendly[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('friendlies')
    .select(`
      *,
      inviting_club:clubs!inviting_club_id(id, name, city),
      invited_club:clubs!invited_club_id(id, name, city)
    `)
    .or(`inviting_club_id.eq.${clubId},invited_club_id.eq.${clubId}`)
    .order('created_at', { ascending: false })

  return { friendlies: (data as Friendly[]) || [], error }
}

// Register pairs for a friendly
export async function registerPairs(
  friendlyId: string,
  clubId: string,
  pairs: { pair_name: string; player_1_id: string; player_2_id?: string }[]
): Promise<{ pairs: FriendlyPair[]; error: Error | null }> {
  const pairsWithIndex = pairs.map((p, index) => ({
    friendly_id: friendlyId,
    club_id: clubId,
    pair_name: p.pair_name,
    player_1_id: p.player_1_id,
    player_2_id: p.player_2_id || null,
    order_index: index,
  }))

  const { data, error } = await supabase
    .from('friendly_pairs')
    .insert(pairsWithIndex)
    .select(`
      *,
      player_1:profiles!player_1_id(id, name, display_name, avatar_url),
      player_2:profiles!player_2_id(id, name, display_name, avatar_url)
    `)

  return { pairs: (data as FriendlyPair[]) || [], error }
}

// Get pairs for a friendly
export async function getFriendlyPairs(friendlyId: string): Promise<{ pairs: FriendlyPair[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('friendly_pairs')
    .select(`
      *,
      player_1:profiles!player_1_id(id, name, display_name, avatar_url),
      player_2:profiles!player_2_id(id, name, display_name, avatar_url)
    `)
    .eq('friendly_id', friendlyId)
    .order('order_index')

  return { pairs: (data as FriendlyPair[]) || [], error }
}

// Lock matchmaking and create matchups
export async function lockMatchmaking(
  friendlyId: string,
  matchups: { pair_a_id: string; pair_b_id: string }[]
): Promise<{ matchups: FriendlyMatchup[]; error: Error | null }> {
  const matchupsWithIndex = matchups.map((m, index) => ({
    friendly_id: friendlyId,
    pair_a_id: m.pair_a_id,
    pair_b_id: m.pair_b_id,
    order_index: index,
  }))

  const { data, error } = await supabase
    .from('friendly_matchups')
    .insert(matchupsWithIndex)
    .select(`
      *,
      pair_a:friendly_pairs!pair_a_id(*, player_1:profiles!player_1_id(id, name, display_name), player_2:profiles!player_2_id(id, name, display_name)),
      pair_b:friendly_pairs!pair_b_id(*, player_1:profiles!player_1_id(id, name, display_name), player_2:profiles!player_2_id(id, name, display_name))
    `)

  if (error) {
    return { matchups: [], error }
  }

  // Update friendly status
  await supabase
    .from('friendlies')
    .update({ status: 'live' })
    .eq('id', friendlyId)

  return { matchups: (data as FriendlyMatchup[]) || [], error: null }
}

// Get matchups for a friendly
export async function getFriendlyMatchups(friendlyId: string): Promise<{ matchups: FriendlyMatchup[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('friendly_matchups')
    .select(`
      *,
      pair_a:friendly_pairs!pair_a_id(*, player_1:profiles!player_1_id(id, name, display_name, avatar_url), player_2:profiles!player_2_id(id, name, display_name, avatar_url)),
      pair_b:friendly_pairs!pair_b_id(*, player_1:profiles!player_1_id(id, name, display_name, avatar_url), player_2:profiles!player_2_id(id, name, display_name, avatar_url)),
      match:matches(id, score_sets(team1_score, team2_score))
    `)
    .eq('friendly_id', friendlyId)
    .order('order_index')

  return { matchups: (data as FriendlyMatchup[]) || [], error }
}

// Record a match result within a friendly
export async function recordFriendlyMatch(
  matchupId: string,
  matchData: {
    club_id: string
    sport: string
    match_type: 'doubles'
    participants: { user_id: string; team: number }[]
    score_sets: { set_number: number; team1_score: number; team2_score: number }[]
  }
): Promise<{ match: { id: string }; error: Error | null }> {
  // First create the match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      club_id: matchData.club_id,
      sport: matchData.sport,
      match_type: matchData.match_type,
      recorded_by: (await supabase.auth.getUser()).data.user?.id,
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

  // Update matchup with match_id and status
  const team1Wins = matchData.score_sets.filter(s => s.team1_score > s.team2_score).length
  const team2Wins = matchData.score_sets.filter(s => s.team2_score > s.team1_score).length
  const winningTeam = team1Wins > team2Wins ? 1 : 2

  // Get the matchup to find which club is on which team
  const { data: matchup } = await supabase
    .from('friendly_matchups')
    .select('pair_a:pair_a_id(club_id), pair_b:pair_b_id(club_id)')
    .eq('id', matchupId)
    .single()

  const winnerClubId = winningTeam === 1 
    ? (matchup?.pair_a as unknown as { club_id: string })?.club_id
    : (matchup?.pair_b as unknown as { club_id: string })?.club_id

  await supabase
    .from('friendly_matchups')
    .update({
      match_id: match.id,
      status: 'completed',
      winner_club_id: winnerClubId,
    })
    .eq('id', matchupId)

  return { match: { id: match.id }, error: null }
}

// Complete a friendly and set winner
export async function completeFriendly(friendlyId: string): Promise<{ friendly: Friendly; error: Error | null }> {
  // Count wins per club
  const { data: matchups } = await supabase
    .from('friendly_matchups')
    .select('winner_club_id')
    .eq('friendly_id', friendlyId)
    .eq('status', 'completed')

  const wins: Record<string, number> = {}
  matchups?.forEach(m => {
    if (m.winner_club_id) {
      wins[m.winner_club_id] = (wins[m.winner_club_id] || 0) + 1
    }
  })

  const winningClubId = Object.entries(wins).sort((a, b) => b[1] - a[1])[0]?.[0]

  const { data, error } = await supabase
    .from('friendlies')
    .update({
      status: 'completed',
      winning_club_id: winningClubId,
    })
    .eq('id', friendlyId)
    .select('*, inviting_club:clubs!inviting_club_id(id, name, city), invited_club:clubs!invited_club_id(id, name, city)')
    .single()

  return { friendly: data as Friendly, error }
}

// Decline a friendly
export async function declineFriendly(inviteCode: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('friendlies')
    .update({ status: 'declined' })
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')

  return { error }
}

// Cancel a friendly (by inviting club)
export async function cancelFriendly(friendlyId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('friendlies')
    .update({ status: 'cancelled' })
    .eq('id', friendlyId)

  return { error }
}

// Get friendly statistics for a club
export async function getClubFriendlyStats(clubId: string): Promise<{
  total: number
  wins: number
  losses: number
  winRate: number
  error: Error | null
}> {
  const { data: friendlies, error } = await supabase
    .from('friendlies')
    .select('winning_club_id, inviting_club_id, invited_club_id')
    .eq('status', 'completed')
    .or(`inviting_club_id.eq.${clubId},invited_club_id.eq.${clubId}`)

  if (error) {
    return { total: 0, wins: 0, losses: 0, winRate: 0, error }
  }

  const total = friendlies?.length || 0
  const wins = friendlies?.filter(f => f.winning_club_id === clubId).length || 0
  const losses = total - wins
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  return { total, wins, losses, winRate, error: null }
}

// Subscribe to friendly updates (realtime)
export function subscribeToFriendly(friendlyId: string, callback: (payload: { new: Friendly }) => void) {
  return supabase
    .channel(`friendly:${friendlyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendlies',
        filter: `id=eq.${friendlyId}`,
      },
      callback
    )
    .subscribe()
}

// Subscribe to matchup updates
export function subscribeToMatchups(friendlyId: string, callback: (payload: { new: FriendlyMatchup }) => void) {
  return supabase
    .channel(`matchups:${friendlyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendly_matchups',
        filter: `friendly_id=eq.${friendlyId}`,
      },
      callback
    )
    .subscribe()
}
