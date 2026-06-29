import { supabase } from '../supabase'
import type { Competition, CompetitionClub, CreateCompetitionInput } from '../../types/competition'
import { postCompetitionNotice } from './competitions-announcements'

export {
  registerCompetitionParticipants,
  getCompetitionParticipants,
  removeParticipant,
  inviteMemberToRoster,
  respondToRosterInvite,
  getPendingRosterInvites,
  confirmLineup,
  isAllLineupsConfirmed,
} from './competitions-roster'

export {
  generateMatchups,
  swapMatchupParticipants,
  startCompetition,
  getCompetitionMatchups,
  recordCompetitionMatch,
  completeCompetition,
  getLeagueStandings,
  subscribeToCompetition,
  subscribeToCompetitionMatchups,
} from './competitions-matchups'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function getCurrentUserId(): Promise<string | null> {
  return (await supabase.auth.getUser()).data.user?.id || null
}

export async function createCompetition(
  input: CreateCompetitionInput
): Promise<{ competition: Competition | null; error: Error | null }> {
  const userId = await getCurrentUserId()
  const inviteCode = generateInviteCode()
  const opponentClubIds = Array.from(new Set(input.opponentClubIds || []))
    .filter(clubId => clubId !== input.clubId)

  const { data, error } = await supabase
    .from('competitions')
    .insert({
      club_id: input.clubId,
      title: input.title,
      sport: input.sport,
      format: input.format,
      pairs_count: input.pairsCount || 5,
      sets_count: input.setsCount || 1,
      points_per_set: input.pointsPerSet || 21,
      location: input.location || null,
      roster_mode: input.rosterMode || 'admin',
      rules: input.rules || null,
      start_date: input.startDate || null,
      invite_code: inviteCode,
      status: 'registration',
      created_by: userId,
    })
    .select('*, club:clubs!club_id(id, name, city, logo_url)')
    .single()

  if (error) return { competition: null, error }

  const competition = data as Competition

  const competitionClubRows = [
    {
      competition_id: competition.id,
      club_id: input.clubId,
      status: 'confirmed' as const,
    },
    ...opponentClubIds.map(clubId => ({
      competition_id: competition.id,
      club_id: clubId,
      status: 'invited' as const,
    })),
  ]

  const { error: clubsError } = await supabase
    .from('competition_clubs')
    .insert(competitionClubRows)

  if (clubsError) {
    await supabase.from('competitions').delete().eq('id', competition.id)
    return { competition: null, error: clubsError }
  }

  const hostName = input.myClubName || input.title.split(' vs ')[0] || 'A club'
  await postCompetitionNotice({
    competitionId: competition.id,
    clubIds: [input.clubId],
    title: 'Competition created',
    message: opponentClubIds.length > 0
      ? `${competition.title} has been created. Invited clubs will be notified to accept and set their lineups.`
      : `${competition.title} has been created. Set the lineup from the competition page.`,
    data: { competitionId: competition.id, competition_id: competition.id },
  })

  for (const clubId of opponentClubIds) {
    const { data: admins } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])

    if (admins && admins.length > 0) {
      const notifications = admins.map(a => ({
        user_id: a.user_id,
        type: 'competition_invite',
        title: 'New Competition Invitation',
        message: `${hostName} has challenged your club to a ${input.format}!`,
        data: {
          competitionId: competition.id,
          hostClubId: input.clubId,
          invitedClubId: clubId,
          clubName: hostName,
        },
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }

  return { competition, error: null }
}

export async function getCompetition(
  competitionId: string
): Promise<{ competition: Competition | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*, club:clubs!club_id(id, name, city, logo_url)')
    .eq('id', competitionId)
    .single()

  return { competition: data as Competition | null, error }
}

export async function getCompetitionByInviteCode(
  inviteCode: string
): Promise<{ competition: Competition | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*, club:clubs!club_id(id, name, city, logo_url)')
    .eq('invite_code', inviteCode)
    .single()

  return { competition: data as Competition | null, error }
}

export async function listClubCompetitions(
  clubId: string
): Promise<{ competitions: Competition[]; error: Error | null }> {
  const { data: clubEntries } = await supabase
    .from('competition_clubs')
    .select('competition_id, status')
    .eq('club_id', clubId)

  const ids = clubEntries?.map(c => c.competition_id) || []
  if (ids.length === 0) return { competitions: [], error: null }

  const statusMap = new Map(clubEntries!.map(c => [c.competition_id, c.status]))

  const { data, error } = await supabase
    .from('competitions')
    .select('*, club:clubs!club_id(id, name, city, logo_url)')
    .in('id', ids)
    .order('created_at', { ascending: false })

  const competitions = ((data as Competition[]) || []).map(c => ({
    ...c,
    invitationStatus: statusMap.get(c.id) || 'confirmed',
  }))

  return { competitions, error }
}

export async function cancelCompetition(
  competitionId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('competitions')
    .update({ status: 'cancelled' })
    .eq('id', competitionId)

  return { error }
}

export async function getCompetitionClubs(
  competitionId: string
): Promise<{ clubs: CompetitionClub[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_clubs')
    .select('*, club:clubs!club_id(id, name, city, logo_url)')
    .eq('competition_id', competitionId)

  return { clubs: (data as CompetitionClub[]) || [], error }
}

export async function respondToCompetitionInvite(
  inviteCode: string,
  clubId: string
): Promise<{ error: Error | null }> {
  const { data: comp } = await supabase
    .from('competitions')
    .select('id, title, club_id, club:clubs!club_id(name)')
    .eq('invite_code', inviteCode)
    .single()

  if (!comp) return { error: new Error('Competition not found') }

  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('competition_clubs')
    .update({ status: 'confirmed' })
    .eq('competition_id', comp.id)
    .eq('club_id', clubId)

  if (error) return { error }

  if (userId) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('type', 'competition_invite')
      .eq('data->>competitionId', comp.id)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('type', 'competition_invite')
      .eq('data->>competition_id', comp.id)
  }

  const { data: acceptedClub } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', clubId)
    .maybeSingle()

  const competitionTitle = comp.title || 'competition'
  const acceptedClubName = acceptedClub?.name || 'Invited club'

  await postCompetitionNotice({
    competitionId: comp.id,
    clubIds: [clubId],
    title: 'Competition invite accepted',
    message: `${acceptedClubName} accepted "${competitionTitle}". Set the lineup from the competition page.`,
    data: { competitionId: comp.id, competition_id: comp.id, clubId },
  })

  await postCompetitionNotice({
    competitionId: comp.id,
    clubIds: [comp.club_id],
    title: 'Competition invite accepted',
    message: `${acceptedClubName} accepted "${competitionTitle}".`,
    data: { competitionId: comp.id, competition_id: comp.id, clubId },
  })

  const { data: hostAdmins } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('club_id', comp.club_id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])

  const hostNotifications = (hostAdmins || [])
    .filter(admin => admin.user_id !== userId)
    .map(admin => ({
      user_id: admin.user_id,
      type: 'competition_update',
      title: 'Competition invite accepted',
      message: `${acceptedClubName} accepted "${competitionTitle}".`,
      data: { competitionId: comp.id, competition_id: comp.id, clubId },
    }))

  if (hostNotifications.length > 0) {
    await supabase.from('notifications').insert(hostNotifications)
  }

  return { error: null }
}

export async function getClubCompetitionStats(clubId: string): Promise<{
  total: number
  wins: number
  losses: number
  winRate: number
  error: Error | null
}> {
  const { data: compClubs } = await supabase
    .from('competition_clubs')
    .select('competition_id')
    .eq('club_id', clubId)

  if (!compClubs || compClubs.length === 0) {
    return { total: 0, wins: 0, losses: 0, winRate: 0, error: null }
  }

  const ids = compClubs.map(c => c.competition_id)

  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('winning_club_id')
    .in('id', ids)
    .eq('status', 'completed')

  if (error) return { total: 0, wins: 0, losses: 0, winRate: 0, error }

  const total = competitions?.length || 0
  const wins = competitions?.filter(c => c.winning_club_id === clubId).length || 0
  const losses = total - wins
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  return { total, wins, losses, winRate, error: null }
}

/** @deprecated Use createCompetition instead */
export async function createFriendly(
  invitingClubId: string,
  invitedClubName: string,
  pairCount: number = 5,
  _invitedContact?: string,
  invitedClubId?: string
): Promise<{ friendly: Competition | null; error: Error | null }> {
  const result = await createCompetition({
    clubId: invitingClubId,
    title: `${invitedClubName} Friendly`,
    sport: 'badminton',
    format: 'friendly',
    opponentClubIds: invitedClubId ? [invitedClubId] : undefined,
    opponentClubNames: [invitedClubName],
    pairsCount: pairCount,
  })
  return { friendly: result.competition, error: result.error }
}

export { respondToCompetitionInvite as acceptFriendly } from './competitions'
export { getCompetition as getFriendly } from './competitions'
export { getCompetitionByInviteCode as getFriendlyByInviteCode } from './competitions'
export { listClubCompetitions as listClubFriendlies } from './competitions'
export { registerCompetitionParticipants as registerPairs } from './competitions-roster'
export { getCompetitionParticipants as getFriendlyPairs } from './competitions-roster'
export { getCompetitionMatchups as getFriendlyMatchups } from './competitions-matchups'
export { recordCompetitionMatch as recordFriendlyMatch } from './competitions-matchups'
export { completeCompetition as completeFriendly } from './competitions-matchups'
export { cancelCompetition as cancelFriendly } from './competitions'
export { getClubCompetitionStats as getClubFriendlyStats } from './competitions'
export { subscribeToCompetition as subscribeToFriendly } from './competitions-matchups'
export { subscribeToCompetitionMatchups as subscribeToMatchups } from './competitions-matchups'
