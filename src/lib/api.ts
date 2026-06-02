import { supabase } from './supabase'
import { getErrorMessage, isMissingRpcFunctionError } from './utils'
import type { 
  Club, 
  Membership, 
  JoinRequest, 
  Match, 
  MatchParticipant, 
  ScoreSet, 
  ClubEvent, 
  EventRsvp,
  Notification,
  ClubActivity,
  ClubMessage
} from '../types'

type ProfileSummary = {
  name?: string | null
  email?: string | null
  display_name?: string | null
}

type ClubMembershipRow = {
  role: string
  clubs: Club | null
}

type MembershipProfileRow = Membership & {
  profiles?: ProfileSummary | null
}

type JoinRequestProfileRow = JoinRequest & {
  profiles?: ProfileSummary | null
}

type EventRsvpProfileRow = EventRsvp & {
  profiles?: ProfileSummary | null
  events?: ClubEvent | null
}

type EventClubRow = ClubEvent & {
  clubs?: Pick<Club, 'id' | 'name' | 'description' | 'open_join' | 'approval_required'> | null
}

type MatchParticipantQueryRow = MatchParticipant & {
  guest_name: string | null
  profiles?: ProfileSummary | null
}

type MatchQueryRow = Match & {
  match_participants?: MatchParticipantQueryRow[] | null
  score_sets?: ScoreSet[] | null
}

type ClubMessageProfileRow = ClubMessage & {
  profiles?: ProfileSummary | null
}

export type ClubLeaderboardRow = {
  name: string
  games: number
  wins: number
  losses: number
  winPercentage: number
  pointsFor: number
  pointsAgainst: number
  points: number
}

export async function ensureCurrentUserProfile(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be authenticated')
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('Error checking profile:', selectError)
    throw selectError
  }

  if (existingProfile) return

  const email = user.email || ''
  const name = user.user_metadata?.name || email.split('@')[0] || 'Member'

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email,
      name,
      role: 'member',
    } as never)

  if (insertError) {
    console.error('Error creating missing profile:', insertError)
    throw insertError
  }
}

// ============================================
// CLUBS
// ============================================

export async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clubs:', error)
    throw error
  }

  return (data as Club[]) || []
}

export async function getClub(id: string): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching club:', error)
    return null
  }

  return data as Club
}

export async function createClub(club: {
  name: string
  description?: string
  location?: string
  city?: string
  sport_focus?: string[]
  open_join?: boolean
  approval_required?: boolean
}): Promise<Club | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to create a club')
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert({
      ...club,
      owner_id: user.id,
    } as never)
    .select()
    .single()

  if (error) {
    console.error('Error creating club:', error)
    throw error
  }

  const createdClub = data as Club

  if (createdClub && !createdClub.invite_code) {
    const inviteCode = await regenerateInviteLink(createdClub.id)
    if (inviteCode) {
      createdClub.invite_code = inviteCode
    }
  }

  return createdClub
}

// ============================================
// MEMBERSHIPS
// ============================================

export async function getMyClubs(): Promise<(Club & { role: string })[]> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('memberships')
    .select('role, clubs(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching my clubs:', error)
    return []
  }

  return ((data || []) as unknown as ClubMembershipRow[]).map((m) => ({
    ...(m.clubs as Club),
    role: m.role,
  }))
}

export async function getClubMembers(clubId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*, profiles(name, email)')
    .eq('club_id', clubId)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching club members:', error)
    return []
  }

  return ((data || []) as unknown as MembershipProfileRow[]).map((m) => ({
    ...m,
    name: m.profiles?.name || 'Unknown',
    email: m.profiles?.email || '',
  }))
}

export async function getMyMembership(clubId: string): Promise<Membership | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return null
  }

  return data as Membership
}

// ============================================
// JOIN REQUESTS
// ============================================

export async function requestJoinClub(clubId: string): Promise<JoinRequest | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to join a club')
  }

  await ensureCurrentUserProfile()

  const { data, error } = await supabase
    .from('join_requests')
    .insert({
      club_id: clubId,
      user_id: user.id,
      status: 'pending',
    } as never)
    .select()
    .single()

  if (error) {
    console.error('Error requesting to join club:', error)
    throw error
  }

  return data as JoinRequest
}

export async function joinOpenClub(clubId: string): Promise<JoinRequest | null> {
  return requestJoinClub(clubId)
}

export async function getClubJoinRequests(clubId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('join_requests')
    .select('*, profiles(name, email)')
    .eq('club_id', clubId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching join requests:', error)
    return []
  }

  return ((data || []) as unknown as JoinRequestProfileRow[]).map((r) => ({
    ...r,
    name: r.profiles?.name || 'Unknown',
    email: r.profiles?.email || '',
  }))
}

export async function approveJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_join_request', {
    target_request_id: requestId,
  })

  if (error) {
    console.error('Error approving join request:', error)
    throw error
  }
}

export async function rejectJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_join_request', {
    target_request_id: requestId,
  })

  if (error) {
    console.error('Error rejecting join request:', error)
    throw error
  }
}

// ============================================
// MATCHES
// ============================================

export interface CreateMatchData {
  club_id: string
  title?: string
  sport: string
  match_type: 'singles' | 'doubles'
  match_date?: string
  participants: {
    team: 1 | 2
    user_id?: string
    is_guest: boolean
    guest_name?: string
  }[]
  score_sets: {
    set_number: number
    team1_score: number
    team2_score: number
  }[]
}

export interface UpdateMatchScoreData {
  match_id: string
  title?: string
  sport?: string
  match_type?: 'singles' | 'doubles'
  match_date?: string
  score_sets: {
    set_number: number
    team1_score: number
    team2_score: number
  }[]
}

async function createMatchDirect(data: CreateMatchData): Promise<Match | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be authenticated to record a match')
  }

  const matchInsert = {
    club_id: data.club_id,
    title: data.title || null,
    sport: data.sport,
    match_type: data.match_type,
    recorded_by: user.id,
    match_date: data.match_date || new Date().toISOString().split('T')[0],
  }

  const { data: match, error: matchInsertError } = await supabase
    .from('matches')
    .insert(matchInsert)
    .select()
    .single()

  if (matchInsertError || !match) {
    console.error('Error inserting match directly:', matchInsertError)
    throw new Error(getErrorMessage(matchInsertError, 'Failed to create match'))
  }

  const participantRows = data.participants.map((participant) => ({
    match_id: match.id,
    team: participant.team,
    user_id: participant.user_id || null,
    is_guest: participant.is_guest,
    guest_name: participant.guest_name || null,
  }))

  const { error: participantsError } = await supabase
    .from('match_participants')
    .insert(participantRows)

  if (participantsError) {
    console.error('Error inserting participants directly:', participantsError)
    throw new Error(getErrorMessage(participantsError, 'Failed to create match participants'))
  }

  const scoreRows = data.score_sets.map((set) => ({
    match_id: match.id,
    set_number: set.set_number,
    team1_score: set.team1_score,
    team2_score: set.team2_score,
  }))

  const { error: scoreError } = await supabase
    .from('score_sets')
    .insert(scoreRows)

  if (scoreError) {
    console.error('Error inserting score sets directly:', scoreError)
    throw new Error(getErrorMessage(scoreError, 'Failed to create match score sets'))
  }

  return match as Match
}

export async function createMatch(data: CreateMatchData): Promise<Match | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to record a match')
  }

  const { data: match, error: matchError } = await supabase.rpc('create_match_with_details', {
    match_club_id: data.club_id,
    match_title: data.title || null,
    match_sport: data.sport,
    match_type_input: data.match_type,
    match_date_input: data.match_date || new Date().toISOString().split('T')[0],
    participants_input: data.participants.map((p) => ({
      team: p.team,
      user_id: p.user_id || null,
      is_guest: p.is_guest,
      guest_name: p.guest_name || null,
    })),
    score_sets_input: data.score_sets.map((s) => ({
      set_number: s.set_number,
      team1_score: s.team1_score,
      team2_score: s.team2_score,
    })),
  })

  if (matchError || !match) {
    console.error('Error creating match:', { match, matchError })
    const fallbackError = matchError
      ? matchError
      : { message: 'No data returned from create_match_with_details' }
    const functionMissing = isMissingRpcFunctionError(fallbackError, 'create_match_with_details')
    if (functionMissing) {
      console.warn('Falling back to direct inserts because create_match_with_details RPC is unavailable.')
      return createMatchDirect(data)
    }
    throw new Error(getErrorMessage(fallbackError, 'Failed to create match'))
  }

  const createdMatch = match as Match
  notifyClubMembers({
    clubId: data.club_id,
    type: 'score_recorded',
    title: 'New match score recorded',
    message: `${createdMatch.title || `${createdMatch.sport} match`} score was added.`,
    data: { clubId: data.club_id, matchId: createdMatch.id },
    activityTitle: 'New match score recorded',
    activityDescription: `${createdMatch.title || `${createdMatch.sport} match`} score was added.`,
    actorFallback: 'Club member',
  }).catch((notificationError) => {
    console.error('Error sending score notifications:', notificationError)
  })

  return createdMatch
}

export async function updateMatch(data: UpdateMatchScoreData): Promise<void> {
  const updatePayload: Record<string, unknown> = {}

  if (data.title !== undefined) updatePayload.title = data.title
  if (data.sport !== undefined) updatePayload.sport = data.sport
  if (data.match_type !== undefined) updatePayload.match_type = data.match_type
  if (data.match_date !== undefined) updatePayload.match_date = data.match_date

  if (Object.keys(updatePayload).length) {
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', data.match_id)

    if (matchUpdateError) {
      console.error('Error updating match:', matchUpdateError)
      throw new Error(getErrorMessage(matchUpdateError, 'Failed to update match'))
    }
  }

  const { error: deleteScoresError } = await supabase
    .from('score_sets')
    .delete()
    .eq('match_id', data.match_id)

  if (deleteScoresError) {
    console.error('Error deleting old score sets:', deleteScoresError)
    throw new Error(getErrorMessage(deleteScoresError, 'Failed to update match scores'))
  }

  const scoreRows = data.score_sets.map((set) => ({
    match_id: data.match_id,
    set_number: set.set_number,
    team1_score: set.team1_score,
    team2_score: set.team2_score,
  }))

  const { error: insertScoresError } = await supabase
    .from('score_sets')
    .insert(scoreRows)

  if (insertScoresError) {
    console.error('Error inserting new score sets:', insertScoresError)
    throw new Error(getErrorMessage(insertScoresError, 'Failed to update match scores'))
  }
}

export async function deleteMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) {
    console.error('Error deleting match:', error)
    throw new Error(getErrorMessage(error, 'Failed to delete match'))
  }
}

async function getClubLeaderboardQuery(clubId: string, limit = 10): Promise<ClubLeaderboardRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      match_participants(
        team,
        guest_name,
        profiles(name, display_name)
      ),
      score_sets(team1_score, team2_score)
    `)
    .eq('club_id', clubId)

  if (error) {
    console.error('Error querying leaderboard directly:', error)
    return []
  }

  const rows = (data || []) as Array<{
    id: string
    match_participants?: Array<{
      team: number
      guest_name: string | null
      profiles?: { name?: string | null; display_name?: string | null } | null
    }>
    score_sets?: Array<{ team1_score: number; team2_score: number }>
  }>

  const leaderboard = new Map<string, { wins: number; losses: number; pointsFor: number; pointsAgainst: number }>()

  for (const match of rows) {
    const scoreSets = match.score_sets || []
    const team1Sets = scoreSets.filter((set) => set.team1_score > set.team2_score).length
    const team2Sets = scoreSets.filter((set) => set.team2_score > set.team1_score).length
    const team1Points = scoreSets.reduce((total, set) => total + set.team1_score, 0)
    const team2Points = scoreSets.reduce((total, set) => total + set.team2_score, 0)

    if (scoreSets.length === 0) continue
    const decidedMatch = team1Sets !== team2Sets
    const winningTeam = team1Sets > team2Sets ? 1 : 2

    for (const participant of match.match_participants || []) {
      const name = participant.profiles?.display_name || participant.profiles?.name || participant.guest_name || 'Unknown'
      const stats = leaderboard.get(name) ?? { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }

      if (participant.team === 1) {
        stats.pointsFor += team1Points
        stats.pointsAgainst += team2Points
      } else {
        stats.pointsFor += team2Points
        stats.pointsAgainst += team1Points
      }

      if (decidedMatch) {
        if (participant.team === winningTeam) {
          stats.wins += 1
        } else {
          stats.losses += 1
        }
      }

      leaderboard.set(name, stats)
    }
  }

  return Array.from(leaderboard.entries())
    .map(([name, { wins, losses, pointsFor, pointsAgainst }]) => {
      const games = wins + losses
      return {
        name,
        games,
        wins,
        losses,
        winPercentage: games > 0 ? Math.round((wins / games) * 100) : 0,
        pointsFor,
        pointsAgainst,
        points: pointsFor - pointsAgainst,
      }
    })
    .sort((a, b) => b.points - a.points || b.winPercentage - a.winPercentage || b.wins - a.wins || a.name.localeCompare(b.name))
    .slice(0, Math.max(limit, 1))
}

export async function getClubMatches(clubId: string): Promise<(Match & { 
  participants: MatchParticipant[], 
  score_sets: ScoreSet[] 
})[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      match_participants(*, profiles(name, display_name)),
      score_sets(*)
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching matches:', error)
    return []
  }

  // Fetch user names for participants
  const matches = ((data || []) as unknown as MatchQueryRow[]).map((match) => {
      const participants = (match.match_participants || []).map((p) => ({
        ...p,
        name: p.profiles?.display_name || p.profiles?.name || p.guest_name || 'Guest',
      })) as MatchParticipant[]
      return {
        ...(match as Match),
        participants,
        score_sets: (match.score_sets || []) as ScoreSet[],
      }
    }
  )

  return matches
}

export async function getClubLeaderboard(clubId: string, limit = 10): Promise<ClubLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_club_leaderboard', {
    target_club_id: clubId,
    row_limit: limit,
  })

  if (error) {
    console.error('Error fetching leaderboard:', error)
    const functionMissing = isMissingRpcFunctionError(error, 'get_club_leaderboard')
    if (functionMissing) {
      console.warn('Falling back to a direct leaderboard query because get_club_leaderboard RPC is unavailable.')
      return getClubLeaderboardQuery(clubId, limit)
    }
    return []
  }

  const rows = (data as unknown as Array<Record<string, unknown>>) || []

  return rows.map((row) => ({
    name: (row.name as string) ?? '',
    games: Number(row.games ?? row.game_count ?? 0),
    wins: Number(row.wins ?? 0),
    losses: Number(row.losses ?? 0),
    winPercentage: Number(row.winPercentage ?? row.win_percentage ?? 0),
    pointsFor: Number(row.pointsFor ?? row.points_for ?? 0),
    pointsAgainst: Number(row.pointsAgainst ?? row.points_against ?? 0),
    points: Number(row.points ?? row.point_difference ?? 0),
  }))
}

// ============================================
// EVENTS
// ============================================

export async function getClubEvents(clubId: string): Promise<ClubEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('club_id', clubId)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return (data as ClubEvent[]) || []
}

export async function getEventDetails(eventId: string): Promise<(ClubEvent & {
  club?: Pick<Club, 'id' | 'name' | 'description' | 'open_join' | 'approval_required'> | null
}) | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*, clubs(id, name, description, open_join, approval_required)')
    .eq('id', eventId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching event details:', error)
    throw error
  }

  const row = data as EventClubRow | null
  if (!row) return null

  return {
    ...row,
    club: row.clubs || null,
    clubName: row.clubs?.name,
  }
}

export async function createEvent(event: {
  club_id: string
  title: string
  event_date: string
  location?: string | null
  cost_amount?: number | null
  cost_note?: string | null
  max_participants?: number | null
  signup_open?: boolean
}): Promise<ClubEvent | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to create an event')
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...event,
      created_by: user.id,
    } as never)
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    throw error
  }

  const createdEvent = data as ClubEvent
  notifyClubMembers({
    clubId: event.club_id,
    type: 'event_created',
    title: 'New game session scheduled',
    message: `${createdEvent.title} is scheduled for ${new Date(createdEvent.event_date).toLocaleString()}.`,
    data: { clubId: event.club_id, eventId: createdEvent.id },
    activityTitle: 'New game session scheduled',
    activityDescription: `${createdEvent.title} was added to the club schedule.`,
    actorFallback: 'Club admin',
  }).catch((notificationError) => {
    console.error('Error sending event notifications:', notificationError)
  })

  return createdEvent
}

export async function updateEvent(eventId: string, updates: {
  title?: string
  event_date?: string
  location?: string | null
  cost_amount?: number | null
  cost_note?: string | null
  max_participants?: number | null
  signup_open?: boolean
}): Promise<ClubEvent> {
  const { data, error } = await supabase
    .from('events')
    .update(updates as never)
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    throw error
  }

  const updatedEvent = data as ClubEvent
  notifyClubMembers({
    clubId: updatedEvent.club_id,
    type: 'event_created',
    title: 'Session updated',
    message: `${updatedEvent.title} has been updated. Please check the latest details.`,
    data: { clubId: updatedEvent.club_id, eventId: updatedEvent.id },
    activityTitle: 'Session updated',
    activityDescription: `${updatedEvent.title} details were updated.`,
    actorFallback: 'Club admin',
  }).catch((notificationError) => {
    console.error('Error sending event update notifications:', notificationError)
  })

  return updatedEvent
}

export async function deleteEvent(event: ClubEvent): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', event.id)

  if (error) {
    console.error('Error deleting event:', error)
    throw error
  }

  notifyClubMembers({
    clubId: event.club_id,
    type: 'event_created',
    title: 'Session cancelled',
    message: `${event.title} has been cancelled.`,
    data: { clubId: event.club_id },
    activityTitle: 'Session cancelled',
    activityDescription: `${event.title} was removed from the schedule.`,
    actorFallback: 'Club admin',
  }).catch((notificationError) => {
    console.error('Error sending event cancellation notifications:', notificationError)
  })
}

// ============================================
// EVENT RSVPS
// ============================================

export async function rsvpToEvent(eventId: string, status: 'going' | 'maybe' | 'not_going'): Promise<EventRsvp | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to RSVP')
  }

  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: eventId,
      user_id: user.id,
      status,
    } as never, { onConflict: 'event_id,user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error creating RSVP:', error)
    throw error
  }

  notifyEventRsvpUpdate(eventId, status).catch((notificationError) => {
    console.error('Error sending RSVP notifications:', notificationError)
  })

  return data as EventRsvp
}

export async function adminUpdateEventRsvp(
  eventId: string,
  userId: string,
  status: 'going' | 'maybe' | 'not_going'
): Promise<EventRsvp | null> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: eventId,
      user_id: userId,
      status,
      updated_at: new Date().toISOString()
    } as never, { onConflict: 'event_id,user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error admin updating RSVP:', error)
    throw error
  }

  return data as EventRsvp
}

export async function joinClubBySharedEvent(eventId: string): Promise<Membership | null> {
  const { data, error } = await supabase.rpc('join_club_by_shared_event', {
    target_event_id: eventId,
  })

  if (error) {
    console.error('Error joining club by shared event:', error)
    throw error
  }

  return data as Membership | null
}

export function buildEventSharePath(eventId: string): string {
  return `/game/${encodeURIComponent(eventId)}`
}

export function buildEventShareUrl(eventId: string): string {
  const path = buildEventSharePath(eventId)
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`
}

export function buildEventShareText(event: Pick<ClubEvent, 'id' | 'title' | 'event_date' | 'location' | 'cost_amount' | 'cost_note'> & { clubName?: string | null }): string {
  const details = [
    event.clubName ? `${event.clubName} game day` : 'Game day',
    event.title,
    new Date(event.event_date).toLocaleString(),
    event.location || null,
    formatShareEventCost(event),
    buildEventShareUrl(event.id),
  ].filter(Boolean)

  return details.join('\n')
}

function formatShareEventCost(event: Pick<ClubEvent, 'cost_amount' | 'cost_note'>) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount = event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

export async function getMyEventRsvps(): Promise<EventRsvp[]> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*, events(*)')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching RSVPs:', error)
    return []
  }

  return ((data || []) as unknown as EventRsvpProfileRow[]).map((r) => ({
    ...r,
    event: r.events,
  }))
}

export async function getEventRsvps(eventId: string): Promise<EventRsvp[]> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*, profiles(name, display_name)')
    .eq('event_id', eventId)

  if (error) {
    console.error('Error fetching event RSVPs:', error)
    return []
  }

  return ((data || []) as unknown as EventRsvpProfileRow[]).map((r) => ({
    ...r,
    name: r.profiles?.display_name || r.profiles?.name || 'Unknown',
  }))
}

// ============================================
// PROFILES
// ============================================

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export type ProfileUpdates = {
  display_name?: string | null
  phone?: string | null
  city?: string | null
  bio?: string | null
  preferred_sport?: string | null
  avatar_url?: string | null
  is_private?: boolean | null
}

export async function updateProfile(userId: string, updates: ProfileUpdates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  return data
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Error uploading profile photo:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(filePath)

  await updateProfile(userId, { avatar_url: data.publicUrl })
  return data.publicUrl
}

// ============================================
// CLUB SETTINGS & INVITES
// ============================================

export async function updateClub(clubId: string, updates: {
  name?: string
  description?: string
  location?: string
  city?: string
  open_join?: boolean
  approval_required?: boolean
  invite_code?: string | null
}): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .update(updates as never)
    .eq('id', clubId)
    .select()
    .single()

  if (error) {
    console.error('Error updating club:', error)
    throw error
  }

  return data as Club
}

export async function joinClubByInviteLinkToken(inviteToken: string): Promise<Membership | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to join a club')
  }

  await ensureCurrentUserProfile()

  const { data, error } = await supabase.rpc('join_club_by_invite_code', {
    invite_code_input: inviteToken,
  })

  if (error) {
    console.error('Error joining club by invite link:', error)
    throw error
  }

  return data as Membership
}

export function buildInvitePath(inviteToken: string): string {
  return `/invite/${encodeURIComponent(inviteToken.trim().toUpperCase())}`
}

export function buildInviteUrl(inviteToken: string): string {
  const path = buildInvitePath(inviteToken)
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export async function regenerateInviteLink(clubId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('regenerate_club_invite_code', {
    target_club_id: clubId,
  })

  if (error) {
    console.error('Error regenerating invite link:', error)
    throw error
  }

  return data || null
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

export async function updateMemberRole(clubId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .update({ role } as never)
    .eq('club_id', clubId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating member role:', error)
    throw error
  }
}

export async function removeMember(clubId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_club_member', {
    target_club_id: clubId,
    target_user_id: userId,
  })

  if (!error) return

  const message = error.message?.toLowerCase() || ''
  const isMissingRpc = message.includes('function') && message.includes('remove_club_member')
  if (!isMissingRpc) {
    console.error('Error removing member:', error)
    throw error
  }

  const { error: fallbackError } = await supabase
    .from('memberships')
    .update({ status: 'inactive', role: 'member' } as never)
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .select('id')
    .single()

  if (fallbackError) {
    console.error('Error removing member:', fallbackError)
    throw fallbackError
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return (data as Notification[]) || []
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification read:', error)
    throw error
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) {
    console.error('Error marking all notifications read:', error)
    throw error
  }
}

type ClubNotificationInput = {
  clubId: string
  type: Notification['type']
  title: string
  message: string
  data?: Record<string, unknown>
  activityTitle?: string
  activityDescription?: string
  actorFallback?: string
}

async function getCurrentProfileName(fallback = 'Club member'): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fallback

  const { data } = await supabase
    .from('profiles')
    .select('display_name, name')
    .eq('id', user.id)
    .maybeSingle()

  const profile = data as { display_name?: string | null; name?: string | null } | null
  return profile?.display_name || profile?.name || fallback
}

async function notifyClubMembers(input: ClubNotificationInput): Promise<void> {
  const actorName = input.activityTitle && input.activityDescription
    ? await getCurrentProfileName(input.actorFallback)
    : input.actorFallback || null

  const { error } = await supabase.rpc('create_club_notifications', {
    target_club_id: input.clubId,
    notification_type: input.type,
    notification_title: input.title,
    notification_message: input.message,
    notification_data: input.data || {},
    activity_title: input.activityTitle || null,
    activity_description: input.activityDescription || null,
    actor_name: actorName,
  })

  if (error) throw error
}

async function notifyEventRsvpUpdate(eventId: string, status: 'going' | 'maybe' | 'not_going'): Promise<void> {
  const { data: event } = await supabase
    .from('events')
    .select('id, club_id, title')
    .eq('id', eventId)
    .maybeSingle()

  const eventRow = event as { id: string; club_id: string; title: string } | null
  if (!eventRow) return

  const actorName = await getCurrentProfileName('A member')
  const readableStatus = status === 'not_going' ? 'not going' : status

  await notifyClubMembers({
    clubId: eventRow.club_id,
    type: 'rsvp_update',
    title: 'Session RSVP updated',
    message: `${actorName} is ${readableStatus} for ${eventRow.title}.`,
    data: { clubId: eventRow.club_id, eventId: eventRow.id },
    activityTitle: 'Session RSVP updated',
    activityDescription: `${actorName} is ${readableStatus} for ${eventRow.title}.`,
    actorFallback: actorName,
  })
}

export async function createClubAnnouncement(clubId: string, title: string, message: string): Promise<ClubMessage> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be authenticated to send a message')
  }

  const { data, error } = await supabase
    .from('club_messages')
    .insert({
      club_id: clubId,
      title,
      message,
      created_by: user.id,
    } as never)
    .select()
    .single()

  if (error) {
    console.error('Error creating club message:', error)
    throw error
  }

  const clubMessage = data as ClubMessage
  await notifyClubMembers({
    clubId,
    type: 'announcement',
    title,
    message,
    data: { clubId, messageId: clubMessage.id },
    activityTitle: title,
    activityDescription: message,
    actorFallback: 'Club admin',
  })

  return clubMessage
}

// ============================================
// CLUB ACTIVITY FEED
// ============================================

export async function getClubMessages(clubId: string): Promise<ClubMessage[]> {
  const { data, error } = await supabase
    .from('club_messages')
    .select('*, profiles(name, display_name)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching club messages:', error)
    return []
  }

  return ((data || []) as unknown as ClubMessageProfileRow[]).map((message) => ({
    ...message,
    authorName: message.profiles?.display_name || message.profiles?.name || 'Club admin',
  }))
}

export async function updateClubMessage(messageId: string, title: string, message: string): Promise<ClubMessage> {
  const { data, error } = await supabase
    .from('club_messages')
    .update({ title, message } as never)
    .eq('id', messageId)
    .select()
    .single()

  if (error) {
    console.error('Error updating club message:', error)
    throw error
  }

  const updatedMessage = data as ClubMessage
  const { error: notificationError } = await supabase
    .from('notifications')
    .update({ title, message } as never)
    .eq('type', 'announcement')
    .eq('data->>messageId', messageId)

  if (notificationError) {
    console.error('Error updating message notifications:', notificationError)
  }

  return updatedMessage
}

export async function deleteClubMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('club_messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting club message:', error)
    throw error
  }

  const { error: notificationError } = await supabase
    .from('notifications')
    .delete()
    .eq('type', 'announcement')
    .eq('data->>messageId', messageId)

  if (notificationError) {
    console.error('Error deleting message notifications:', notificationError)
  }
}

export async function getClubActivity(clubId: string): Promise<ClubActivity[]> {
  const { data, error } = await supabase
    .from('club_activities')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching club activity:', error)
    return []
  }

  return (data as ClubActivity[]) || []
}
