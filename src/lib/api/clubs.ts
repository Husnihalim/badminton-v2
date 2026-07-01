import { supabase } from '../supabase'
import type { Club, Membership, JoinRequest, ClubActivity, ClubMessage } from '../../types'
import { mockClubs, mockMemberships, mockActivities } from '../mockShowcase'
import { ensureCurrentUserProfile } from './profiles'
import { notifyClubMembers } from './notifications'


export type InviteJoinResult = {
  status: 'active' | 'pending'
  club_id: string
  membership_id?: string
  join_request_id?: string
}

export type SpecificClubInvite = {
  id: string
  club_id: string
  token: string
  max_uses: number
  used_count: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

type ProfileSummary = {
  name?: string | null
  email?: string | null
  display_name?: string | null
  avatar_url?: string | null
  singles_elo?: number | null
  doubles_elo?: number | null
  singles_games?: number | null
  doubles_games?: number | null
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

type ClubMessageProfileRow = ClubMessage & {
  profiles?: ProfileSummary | null
}

export async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, description, location, city, sport_focus, open_join, approval_required, invite_code, owner_id, created_at, updated_at, logo_url, banner_url, banner_preset, accent_color, announcement, announcement_updated_at, is_private')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clubs:', error)
    throw error
  }

  return (data as Club[]) || []
}

export async function getClub(id: string): Promise<Club | null> {
  if (id && id.startsWith('mock-')) {
    return mockClubs[id] || null
  }
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, description, location, city, sport_focus, open_join, approval_required, invite_code, owner_id, created_at, updated_at, logo_url, banner_url, banner_preset, accent_color, announcement, announcement_updated_at, is_private')
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
      sport_focus: ['badminton'],
      open_join: true,
      approval_required: true,
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
  if (clubId && clubId.startsWith('mock-')) {
    return mockMemberships[clubId] || []
  }
  const { data, error } = await supabase
    .from('memberships')
    .select('*, profiles(name, display_name, email, avatar_url, singles_elo, doubles_elo, singles_games, doubles_games)')
    .eq('club_id', clubId)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching club members:', error)
    return []
  }

  return ((data || []) as unknown as MembershipProfileRow[]).map((m) => ({
    ...m,
    name: m.profiles?.display_name || m.profiles?.name || 'Unknown',
    email: m.profiles?.email || '',
    avatar_url: m.profiles?.avatar_url || null,
    singles_elo: m.profiles?.singles_elo || null,
    doubles_elo: m.profiles?.doubles_elo || null,
    singles_games: m.profiles?.singles_games || null,
    doubles_games: m.profiles?.doubles_games || null,
  }))
}

export async function getMyMembership(clubId: string): Promise<Membership | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('memberships')
    .select('id, club_id, user_id, role, status, joined_at, approved_by')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return null
  }

  return data as Membership
}

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

export async function updateClub(clubId: string, updates: {
  name?: string
  description?: string
  location?: string
  city?: string
  open_join?: boolean
  approval_required?: boolean
  invite_code?: string | null
  logo_url?: string | null
  banner_url?: string | null
  banner_preset?: string | null
  accent_color?: string | null
  announcement?: string | null
  announcement_updated_at?: string | null
  is_private?: boolean | null
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

export async function uploadClubLogo(clubId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${clubId}/logo-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('club-logos')
    .upload(filePath, file, {
      cacheControl: '3600',
    })

  if (uploadError) {
    console.error('Error uploading club logo:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('club-logos')
    .getPublicUrl(filePath)

  await updateClub(clubId, { logo_url: data.publicUrl })
  return data.publicUrl
}

export async function uploadClubBanner(clubId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${clubId}/banner-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('club-banners')
    .upload(filePath, file, {
      cacheControl: '3600',
    })

  if (uploadError) {
    console.error('Error uploading club banner:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('club-banners')
    .getPublicUrl(filePath)

  await updateClub(clubId, { banner_url: data.publicUrl, banner_preset: null })
  return data.publicUrl
}

export async function joinClubByInviteLinkToken(inviteToken: string): Promise<InviteJoinResult | null> {
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

  return data as InviteJoinResult
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

export async function createSpecificInviteLink(clubId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_specific_club_invite_code', {
    target_club_id: clubId,
  })

  if (error) {
    console.error('Error creating specific invite link:', error)
    throw error
  }

  return data || null
}

export async function getSpecificInviteLinks(clubId: string): Promise<SpecificClubInvite[]> {
  const { data, error } = await supabase
    .from('club_specific_invites')
    .select('id, club_id, token, max_uses, used_count, expires_at, revoked_at, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching specific invite links:', error)
    throw error
  }

  return (data as SpecificClubInvite[]) || []
}

export async function revokeSpecificInviteLink(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_specific_club_invite_code', {
    target_invite_id: inviteId,
  })

  if (error) {
    console.error('Error revoking specific invite link:', error)
    throw error
  }
}

export async function updateMemberRole(clubId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
  if (role === 'owner') {
    throw new Error('Ownership transfers are not supported here.')
  }

  const { error } = await supabase.rpc('update_member_role', {
    target_club_id: clubId,
    target_user_id: userId,
    new_role: role,
  })

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
  if (clubId && clubId.startsWith('mock-')) {
    return mockActivities[clubId] || []
  }
  const { data, error } = await supabase
    .from('club_activities')
    .select('id, club_id, type, title, description, actor_name, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching club activity:', error)
    return []
  }

  return (data as ClubActivity[]) || []
}
