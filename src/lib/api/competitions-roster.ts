import { supabase } from '../supabase'
import type { CompetitionParticipant, RosterInvite } from '../../types/competition'

type ProfileSummary = {
  id: string
  name: string
  display_name: string | null
  avatar_url: string | null
}

function normalizeClubData(data: unknown) {
  if (!data) return null
  return Array.isArray(data) ? data[0] : data
}

async function hydrateCompetitionParticipants(
  participants: CompetitionParticipant[]
): Promise<CompetitionParticipant[]> {
  const profileIds = Array.from(new Set(
    participants
      .flatMap(participant => [participant.user_1_id, participant.user_2_id])
      .filter((id): id is string => Boolean(id))
  ))

  if (profileIds.length === 0) return participants

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, display_name, avatar_url')
    .in('id', profileIds)

  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile as ProfileSummary]))

  return participants.map(participant => ({
    ...participant,
    player_1: participant.user_1_id ? profileMap.get(participant.user_1_id) || null : null,
    player_2: participant.user_2_id ? profileMap.get(participant.user_2_id) || null : null,
  }))
}

export async function registerCompetitionParticipants(
  competitionId: string,
  clubId: string,
  participants: { name: string; user_1_id: string; user_2_id?: string | null; rank?: number }[]
): Promise<{ participants: CompetitionParticipant[]; error: Error | null }> {
  const inserts = participants.map(p => ({
    competition_id: competitionId,
    club_id: clubId,
    name: p.name,
    user_1_id: p.user_1_id,
    user_2_id: p.user_2_id || null,
    rank: p.rank || null,
    user_1_status: 'accepted',
    user_2_status: p.user_2_id ? 'accepted' : 'accepted',
  }))

  const { data, error } = await supabase
    .from('competition_participants')
    .insert(inserts)
    .select('id, competition_id, pool_id, club_id, name, user_1_id, user_2_id, user_1_status, user_2_status, seed, rank, created_at')

  const hydrated = await hydrateCompetitionParticipants((data as CompetitionParticipant[]) || [])
  return { participants: hydrated, error }
}

export async function getCompetitionParticipants(
  competitionId: string
): Promise<{ participants: CompetitionParticipant[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_participants')
    .select('id, competition_id, pool_id, club_id, name, user_1_id, user_2_id, user_1_status, user_2_status, seed, rank, created_at')
    .eq('competition_id', competitionId)
    .order('rank', { nullsFirst: false })

  const hydrated = await hydrateCompetitionParticipants((data as CompetitionParticipant[]) || [])
  return { participants: hydrated, error }
}

export async function removeParticipant(
  participantId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('competition_participants')
    .delete()
    .eq('id', participantId)

  return { error }
}

export async function inviteMemberToRoster(
  competitionId: string,
  clubId: string,
  userId: string,
  partnerId: string | null = null,
  rank: number | null = null
): Promise<{ participant: CompetitionParticipant | null; error: Error | null }> {
  try {
    if (partnerId && partnerId === userId) {
      throw new Error('A pair needs two different players.')
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, name, display_name')
      .eq('id', userId)
      .single()

    if (!userProfile) throw new Error('User not found')

    let partnerProfile = null
    if (partnerId) {
      const { data: pp } = await supabase
        .from('profiles')
        .select('id, name, display_name')
        .eq('id', partnerId)
        .single()
      partnerProfile = pp
    }

    const name = partnerProfile
      ? `${userProfile.display_name || userProfile.name} / ${partnerProfile.display_name || partnerProfile.name}`
      : `${userProfile.display_name || userProfile.name}`

    const { data: comp } = await supabase
      .from('competitions')
      .select('title, club:clubs!club_id(name)')
      .eq('id', competitionId)
      .single()

    if (!comp) throw new Error('Competition not found')

    const { data: participant, error: partError } = await supabase
      .from('competition_participants')
      .insert({
        competition_id: competitionId,
        club_id: clubId,
        name,
        user_1_id: userId,
        user_2_id: partnerId || null,
        rank,
        user_1_status: 'pending',
        user_2_status: partnerId ? 'pending' : 'accepted',
      })
      .select('id, competition_id, pool_id, club_id, name, user_1_id, user_2_id, user_1_status, user_2_status, seed, rank, created_at')
      .single()

    if (partError) throw partError
    const [hydratedParticipant] = await hydrateCompetitionParticipants([participant as CompetitionParticipant])

    const clubName = normalizeClubData(comp.club)?.name || 'Admin'
    const inviteMessage = `${clubName} invited you to play in "${comp.title}"`

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'roster_invite',
      title: 'Roster Invitation',
      message: inviteMessage,
      data: { competition_id: competitionId, participant_id: participant.id },
    })

    if (partnerId) {
      await supabase.from('notifications').insert({
        user_id: partnerId,
        type: 'roster_invite',
        title: 'Roster Invitation',
        message: inviteMessage,
        data: { competition_id: competitionId, participant_id: participant.id },
      })
    }

    return { participant: hydratedParticipant, error: null }
  } catch (err) {
    return { participant: null, error: err as Error }
  }
}

export async function respondToRosterInvite(
  participantId: string,
  userId: string,
  accept: boolean
): Promise<{ error: Error | null }> {
  try {
    const { data: part, error: fetchError } = await supabase
      .from('competition_participants')
      .select('*, competition:competitions(*)')
      .eq('id', participantId)
      .single()

    if (fetchError) throw fetchError

    const isUser1 = part.user_1_id === userId
    const isUser2 = part.user_2_id === userId
    if (!isUser1 && !isUser2) throw new Error('Not a member of this pair')

    const nextStatus = accept ? 'accepted' : 'declined'
    const updatePayload: Record<string, string> = {}
    if (isUser1) updatePayload.user_1_status = nextStatus
    if (isUser2) updatePayload.user_2_status = nextStatus

    await supabase.from('competition_participants').update(updatePayload).eq('id', participantId)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('type', 'roster_invite')
      .eq('data->>participant_id', participantId)

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, display_name')
      .eq('id', userId)
      .single()

    const playerName = profile?.display_name || profile?.name || 'A player'
    const compTitle = (part.competition as { title: string })?.title || 'competition'

    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('club_id', part.club_id)
      .in('role', ['owner', 'admin'])

    const adminIds = (members || []).map(m => m.user_id).filter(id => id !== userId)

    for (const adminId of adminIds) {
      await supabase.from('notifications').insert({
        user_id: adminId,
        type: 'competition_update',
        title: accept ? 'Invitation Accepted' : 'Invitation Declined',
        message: `${playerName} has ${accept ? 'accepted' : 'declined'} for "${compTitle}"`,
        data: { competition_id: part.competition_id, participant_id: participantId },
      })
    }

    if (!accept) {
      await supabase.from('competition_participants').delete().eq('id', participantId)
    }

    return { error: null }
  } catch (err) {
    return { error: err as Error }
  }
}

export async function getPendingRosterInvites(
  userId: string
): Promise<{ invites: RosterInvite[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('competition_participants')
      .select(`
        id,
        competition_id,
        club_id,
        name,
        user_1_id,
        user_2_id,
        user_1_status,
        user_2_status,
        competition:competitions(title, start_date, club:clubs!club_id(name))
      `)
      .or(`and(user_1_id.eq.${userId},user_1_status.eq.pending),and(user_2_id.eq.${userId},user_2_status.eq.pending)`)

    if (error) throw error

    const invites: RosterInvite[] = (data || []).map(item => {
      const c = Array.isArray(item.competition) ? item.competition[0] : item.competition
      const clubData = c ? (Array.isArray(c.club) ? c.club[0] : c.club) : null
      return {
        id: item.id,
        competition_id: item.competition_id,
        club_id: item.club_id,
        name: item.name,
        user_1_id: item.user_1_id,
        user_2_id: item.user_2_id,
        user_1_status: item.user_1_status as 'pending' | 'accepted' | 'declined',
        user_2_status: item.user_2_status as 'pending' | 'accepted' | 'declined',
        competition: c ? { title: c.title, start_date: c.start_date, club: clubData ? { name: clubData.name } : null } : null,
      }
    })

    return { invites, error: null }
  } catch (err) {
    return { invites: [], error: err as Error }
  }
}

export async function confirmLineup(
  competitionId: string,
  clubId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('competition_clubs')
    .update({ lineup_confirmed: true, lineup_confirmed_at: new Date().toISOString() })
    .eq('competition_id', competitionId)
    .eq('club_id', clubId)

  if (error) return { error }

  const { data: clubs } = await supabase
    .from('competition_clubs')
    .select('lineup_confirmed')
    .eq('competition_id', competitionId)
    .eq('status', 'confirmed')

  const allConfirmed = clubs?.every(c => c.lineup_confirmed)
  if (allConfirmed) {
    await supabase
      .from('competitions')
      .update({ status: 'matchmaking' })
      .eq('id', competitionId)
  }

  return { error: null }
}

export async function isAllLineupsConfirmed(
  competitionId: string
): Promise<boolean> {
  const { data: clubs } = await supabase
    .from('competition_clubs')
    .select('lineup_confirmed')
    .eq('competition_id', competitionId)
    .eq('status', 'confirmed')

  return clubs?.every(c => c.lineup_confirmed) ?? false
}
