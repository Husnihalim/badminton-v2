import { supabase } from '../supabase'
import type { Notification } from '../../types'

export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, data, read, created_at')
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

export type ClubNotificationInput = {
  clubId: string
  type: Notification['type']
  title: string
  message: string
  data?: Record<string, unknown>
  activityTitle?: string
  activityDescription?: string
  actorFallback?: string
}

export async function getCurrentProfileName(fallback = 'Club member'): Promise<string> {
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

export async function notifyClubMembers(input: ClubNotificationInput): Promise<void> {
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

export async function notifyEventRsvpUpdate(eventId: string, status: 'going' | 'maybe' | 'not_going'): Promise<void> {
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
