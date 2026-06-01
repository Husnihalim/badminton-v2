import { supabase } from './supabase'
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
  ClubActivity
} from '../types'

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
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Error creating club:', error)
    throw error
  }

  return data as Club
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

  return ((data || []) as any[]).map((m) => ({
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

  return ((data || []) as any[]).map((m) => ({
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

  const { data, error } = await supabase
    .from('join_requests')
    .insert({
      club_id: clubId,
      user_id: user.id,
      status: 'pending',
    } as any)
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

  return ((data || []) as any[]).map((r) => ({
    ...r,
    name: r.profiles?.name || 'Unknown',
    email: r.profiles?.email || '',
  }))
}

export async function approveJoinRequest(requestId: string): Promise<void> {
  const { data: { user: approver } } = await supabase.auth.getUser()

  if (!approver) {
    throw new Error('Must be authenticated to approve join requests')
  }

  const { data: request, error: requestError } = await supabase
    .from('join_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    console.error('Error fetching join request:', requestError)
    throw requestError || new Error('Join request not found')
  }

  const joinRequest = request as JoinRequest

  const { data: existingMembership, error: membershipSelectError } = await supabase
    .from('memberships')
    .select('*')
    .eq('club_id', joinRequest.club_id)
    .eq('user_id', joinRequest.user_id)
    .maybeSingle()

  if (membershipSelectError) {
    console.error('Error checking existing membership:', membershipSelectError)
    throw membershipSelectError
  }

  if (!existingMembership) {
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        club_id: joinRequest.club_id,
        user_id: joinRequest.user_id,
        role: 'member',
        status: 'active',
        approved_by: approver.id,
      } as any)

    if (membershipError) {
      console.error('Error creating approved membership:', membershipError)
      throw membershipError
    }
  }

  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'approved' } as any)
    .eq('id', requestId)

  if (error) {
    console.error('Error approving join request:', error)
    throw error
  }
}

export async function rejectJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'rejected' } as any)
    .eq('id', requestId)

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

export async function createMatch(data: CreateMatchData): Promise<Match | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be authenticated to record a match')
  }

  // Create the match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      club_id: data.club_id,
      title: data.title,
      sport: data.sport,
      match_type: data.match_type,
      recorded_by: user.id,
      match_date: data.match_date || new Date().toISOString().split('T')[0],
    } as any)
    .select()
    .single()

  if (matchError || !match) {
    console.error('Error creating match:', matchError)
    throw matchError
  }

  const matchId = (match as any).id

  // Create participants
  if (data.participants.length > 0) {
    const { error: participantsError } = await supabase
      .from('match_participants')
      .insert(
        data.participants.map(p => ({
          match_id: matchId,
          user_id: p.user_id || null,
          team: p.team,
          is_guest: p.is_guest,
          guest_name: p.guest_name || null,
        })) as any
      )

    if (participantsError) {
      console.error('Error creating match participants:', participantsError)
    }
  }

  // Create score sets
  if (data.score_sets.length > 0) {
    const { error: scoresError } = await supabase
      .from('score_sets')
      .insert(
        data.score_sets.map(s => ({
          match_id: matchId,
          set_number: s.set_number,
          team1_score: s.team1_score,
          team2_score: s.team2_score,
        })) as any
      )

    if (scoresError) {
      console.error('Error creating score sets:', scoresError)
    }
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

export async function getClubMatches(clubId: string): Promise<(Match & { 
  participants: MatchParticipant[], 
  score_sets: ScoreSet[] 
})[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      match_participants(*),
      score_sets(*)
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching matches:', error)
    return []
  }

  // Fetch user names for participants
  const matches = await Promise.all(
    ((data || []) as any[]).map(async (match) => {
      const participants = await Promise.all(
        (match.match_participants || []).map(async (p: any) => {
          if (p.user_id && !p.is_guest) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', p.user_id)
              .single()
            return { ...p, name: profile?.name || 'Unknown' } as MatchParticipant
          }
          return { ...p, name: p.guest_name || 'Guest' } as MatchParticipant
        })
      )

      return {
        ...(match as Match),
        participants,
        score_sets: (match.score_sets || []) as ScoreSet[],
      }
    })
  )

  return matches
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

export async function createEvent(event: {
  club_id: string
  title: string
  event_date: string
  location?: string
  cost_amount?: number | null
  cost_note?: string | null
  max_participants?: number
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
    } as any)
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
    } as any)
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

  return ((data || []) as any[]).map((r) => ({
    ...r,
    event: r.events,
  }))
}

export async function getEventRsvps(eventId: string): Promise<EventRsvp[]> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*, profiles(name)')
    .eq('event_id', eventId)

  if (error) {
    console.error('Error fetching event RSVPs:', error)
    return []
  }

  return ((data || []) as any[]).map((r) => ({
    ...r,
    name: r.profiles?.name || 'Unknown',
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
}

export async function updateProfile(userId: string, updates: ProfileUpdates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as any)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  return data
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
    .update(updates as any)
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
  const newToken = Math.random().toString(36).substring(2, 10).toUpperCase()
  
  const { data, error } = await supabase
    .from('clubs')
    .update({ invite_code: newToken } as any)
    .eq('id', clubId)
    .select('invite_code')
    .single()

  if (error) {
    console.error('Error regenerating invite link:', error)
    throw error
  }

  return data?.invite_code || null
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

export async function updateMemberRole(clubId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .update({ role } as any)
    .eq('club_id', clubId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating member role:', error)
    throw error
  }
}

export async function removeMember(clubId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('club_id', clubId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing member:', error)
    throw error
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
    .update({ read: true } as any)
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
    .update({ read: true } as any)
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
  const { data: members, error } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('club_id', input.clubId)
    .eq('status', 'active')

  if (error) throw error

  const notifications = ((members || []) as { user_id: string }[]).map((member) => ({
    user_id: member.user_id,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data || {},
    read: false,
  }))

  if (notifications.length) {
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications as any)

    if (notificationError) throw notificationError
  }

  if (input.activityTitle && input.activityDescription) {
    const actorName = await getCurrentProfileName(input.actorFallback)
    const { error: activityError } = await supabase
      .from('club_activities')
      .insert({
        club_id: input.clubId,
        type: input.type === 'event_created' || input.type === 'rsvp_update' ? input.type : 'announcement',
        title: input.activityTitle,
        description: input.activityDescription,
        actor_name: actorName,
      } as any)

    if (activityError) throw activityError
  }
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

export async function createClubAnnouncement(clubId: string, title: string, message: string): Promise<void> {
  await notifyClubMembers({
    clubId,
    type: 'announcement',
    title,
    message,
    data: { clubId },
    activityTitle: title,
    activityDescription: message,
    actorFallback: 'Club admin',
  })
}

// ============================================
// CLUB ACTIVITY FEED
// ============================================

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
