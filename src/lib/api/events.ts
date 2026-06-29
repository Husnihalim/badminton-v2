import { supabase } from '../supabase'
import type { Club, ClubEvent, EventRsvp, Membership } from '../../types'
import { mockEvents, mockRsvps } from '../mockShowcase'
import { notifyClubMembers, notifyEventRsvpUpdate } from './notifications'

type EventClubRow = ClubEvent & {
  clubs?: Pick<Club, 'id' | 'name' | 'description' | 'open_join' | 'approval_required'> | null
}

type EventRsvpProfileRow = EventRsvp & {
  profiles?: {
    name?: string | null
    email?: string | null
    display_name?: string | null
    avatar_url?: string | null
  } | null
  events?: ClubEvent | null
}

type AdminEventRsvpPayload = {
  event_id: string
  user_id: string
  status: 'going' | 'maybe' | 'not_going'
  updated_at: string
  attended?: boolean
  paid?: boolean
}

export async function getClubEvents(clubId: string): Promise<ClubEvent[]> {
  if (clubId && clubId.startsWith('mock-')) {
    return mockEvents[clubId] || []
  }
  const { data, error } = await supabase
    .from('events')
    .select('id, club_id, title, event_date, location, cost_amount, cost_note, max_participants, description, status, signup_open, created_by, created_at, updated_at')
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
  status: 'going' | 'maybe' | 'not_going',
  attended?: boolean,
  paid?: boolean
): Promise<EventRsvp | null> {
  const payload: AdminEventRsvpPayload = {
    event_id: eventId,
    user_id: userId,
    status,
    updated_at: new Date().toISOString()
  }
  if (attended !== undefined) payload.attended = attended
  if (paid !== undefined) payload.paid = paid

  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert(payload as never, { onConflict: 'event_id,user_id' })
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
  if (eventId && (eventId.startsWith('event-lep-') || eventId.startsWith('event-smash-'))) {
    return mockRsvps[eventId] || []
  }
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*, profiles(name, display_name, avatar_url)')
    .eq('event_id', eventId)

  if (error) {
    console.error('Error fetching event RSVPs:', error)
    return []
  }

  return ((data || []) as unknown as EventRsvpProfileRow[]).map((r) => ({
    ...r,
    name: r.profiles?.display_name || r.profiles?.name || 'Unknown',
    avatar_url: r.profiles?.avatar_url,
  }))
}
