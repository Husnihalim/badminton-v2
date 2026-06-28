import { supabase } from '../supabase'
import type {
  Competition,
  CompetitionClub,
  CompetitionParticipant,
  CompetitionMatchup,
  CreateCompetitionInput,
  RosterInvite
} from '../../types/competition'
import {
  competitionParticipantsShareUser,
  getDuplicateCompetitionUserMessage,
  getMatchupParticipantOverlapMessage,
  type CompetitionParticipantIdentity,
} from '../competitionIntegrity'

type ProfileSummary = {
  id: string
  name: string
  display_name: string | null
  avatar_url: string | null
}

type ParticipantIdentityRow = CompetitionParticipantIdentity & {
  id: string
  rank?: number | null
}
// ============================================
// HELPERS
// ============================================
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function getCurrentUserId(): Promise<string | null> {
  return (await supabase.auth.getUser()).data.user?.id || null
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

async function hydrateCompetitionMatchups(
  matchups: CompetitionMatchup[]
): Promise<CompetitionMatchup[]> {
  const participants = matchups
    .flatMap(matchup => [matchup.participant_a, matchup.participant_b])
    .filter((participant): participant is CompetitionParticipant => Boolean(participant))

  const hydratedParticipants = await hydrateCompetitionParticipants(participants)
  const participantMap = new Map(hydratedParticipants.map(participant => [participant.id, participant]))

  return matchups.map(matchup => ({
    ...matchup,
    participant_a: matchup.participant_a ? participantMap.get(matchup.participant_a.id) || matchup.participant_a : matchup.participant_a,
    participant_b: matchup.participant_b ? participantMap.get(matchup.participant_b.id) || matchup.participant_b : matchup.participant_b,
  }))
}

// ============================================
// CORE CRUD
// ============================================

export async function createCompetition(
  input: CreateCompetitionInput
): Promise<{ competition: Competition | null; error: Error | null }> {
  const userId = await getCurrentUserId()
  const inviteCode = generateInviteCode()

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
    ...(input.opponentClubIds || []).map(clubId => ({
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

  // Notify admins/owners of opponent clubs about the invitation
  const hostName = input.myClubName || input.title.split(' vs ')[0] || 'A club'
  for (const clubId of input.opponentClubIds || []) {
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

// ============================================
// CLUB MANAGEMENT
// ============================================

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
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  if (!comp) return { error: new Error('Competition not found') }

  const { error } = await supabase
    .from('competition_clubs')
    .update({ status: 'confirmed' })
    .eq('competition_id', comp.id)
    .eq('club_id', clubId)

  return { error }
}

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

export async function registerCompetitionParticipants(
  competitionId: string,
  clubId: string,
  participants: { name: string; user_1_id: string; user_2_id?: string | null; rank?: number }[]
): Promise<{ participants: CompetitionParticipant[]; error: Error | null }> {
  const newParticipants = participants.map((p, index) => ({
    id: `new-${index}`,
    name: p.name,
    user_1_id: p.user_1_id,
    user_2_id: p.user_2_id || null,
  }))

  const newParticipantError = getDuplicateCompetitionUserMessage(newParticipants)
  if (newParticipantError) return { participants: [], error: new Error(newParticipantError) }

  const { data: existingParticipants, error: existingError } = await supabase
    .from('competition_participants')
    .select('id, name, user_1_id, user_2_id')
    .eq('competition_id', competitionId)

  if (existingError) return { participants: [], error: existingError }

  const combinedParticipantError = getDuplicateCompetitionUserMessage([
    ...((existingParticipants as ParticipantIdentityRow[]) || []),
    ...newParticipants,
  ])
  if (combinedParticipantError) return { participants: [], error: new Error(combinedParticipantError) }

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
    .select('*')

  const hydrated = await hydrateCompetitionParticipants((data as CompetitionParticipant[]) || [])
  return { participants: hydrated, error }
}

export async function getCompetitionParticipants(
  competitionId: string
): Promise<{ participants: CompetitionParticipant[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_participants')
    .select('*')
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

// ============================================
// ROSTER INVITE FLOW
// ============================================

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

    const { data: existingParticipants, error: existingError } = await supabase
      .from('competition_participants')
      .select('id, name, user_1_id, user_2_id')
      .eq('competition_id', competitionId)

    if (existingError) throw existingError

    const duplicateMessage = getDuplicateCompetitionUserMessage([
      ...((existingParticipants as ParticipantIdentityRow[]) || []),
      {
        id: 'new-roster-invite',
        name: 'This invite',
        user_1_id: userId,
        user_2_id: partnerId,
      },
    ])

    if (duplicateMessage) throw new Error(duplicateMessage)

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
      .select('*')
      .single()

    if (partError) throw partError
    const [hydratedParticipant] = await hydrateCompetitionParticipants([participant as CompetitionParticipant])

    const clubName = normalizeClubData(comp.club)?.name || 'Admin'
    const inviteMessage = `${clubName} invited you to play in "${comp.title}"`

    // Notify player 1
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'roster_invite',
      title: 'Roster Invitation',
      message: inviteMessage,
      data: { competition_id: competitionId, participant_id: participant.id },
    })

    // Notify player 2 if exists
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

    // Mark notification read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('type', 'roster_invite')
      .eq('data->>participant_id', participantId)

    // Notify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, display_name')
      .eq('id', userId)
      .single()

    const playerName = profile?.display_name || profile?.name || 'A player'
    const compTitle = (part.competition as { title: string })?.title || 'competition'

    // Find admin(s) of the competition host club
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

// ============================================
// LINEUP MANAGEMENT
// ============================================

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

  // Check if all clubs have confirmed
  const { data: clubs } = await supabase
    .from('competition_clubs')
    .select('lineup_confirmed')
    .eq('competition_id', competitionId)
    .eq('status', 'confirmed')

  const allConfirmed = clubs?.every(c => c.lineup_confirmed)
  if (allConfirmed) {
    // Auto-advance to matchmaking stage
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

// ============================================
// MATCHUP MANAGEMENT
// ============================================

export async function generateMatchups(
  competitionId: string
): Promise<{ matchups: CompetitionMatchup[]; error: Error | null }> {
  const existing = await getCompetitionMatchups(competitionId)
  if (existing.error) return existing
  if (existing.matchups.length > 0) {
    return { matchups: existing.matchups, error: null }
  }

  const { data: comp } = await supabase
    .from('competitions')
    .select('pairs_count')
    .eq('id', competitionId)
    .single()

  if (!comp) return { matchups: [], error: new Error('Competition not found') }

  const pairCount = comp.pairs_count || 5

  // Get all confirmed clubs
  const { data: clubs } = await supabase
    .from('competition_clubs')
    .select('id, club_id')
    .eq('competition_id', competitionId)
    .eq('status', 'confirmed')
    .eq('lineup_confirmed', true)

  if (!clubs || clubs.length < 2) {
    return { matchups: [], error: new Error('Need at least 2 confirmed clubs') }
  }

  // Generate all round-robin pairings (club A vs club B, etc.)
  const clubPairs: { clubA: typeof clubs[0]; clubB: typeof clubs[0] }[] = []
  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      clubPairs.push({ clubA: clubs[i], clubB: clubs[j] })
    }
  }

  const allMatchups: Partial<CompetitionMatchup>[] = []
  let orderIndex = 0

  for (let roundIdx = 0; roundIdx < clubPairs.length; roundIdx++) {
    const { clubA, clubB } = clubPairs[roundIdx]

    // Get participants for each club, ordered by rank
    const { data: participantsA } = await supabase
      .from('competition_participants')
      .select('id, name, user_1_id, user_2_id, rank')
      .eq('competition_id', competitionId)
      .eq('club_id', clubA.club_id)
      .order('rank', { nullsFirst: false })

    const { data: participantsB } = await supabase
      .from('competition_participants')
      .select('id, name, user_1_id, user_2_id, rank')
      .eq('competition_id', competitionId)
      .eq('club_id', clubB.club_id)
      .order('rank', { nullsFirst: false })

    if (!participantsA || !participantsB) continue

    const rankedParticipantsA = (participantsA as ParticipantIdentityRow[]).slice(0, pairCount)
    const rankedParticipantsB = participantsB as ParticipantIdentityRow[]
    const usedParticipantBIds = new Set<string>()

    for (const participantA of rankedParticipantsA) {
      const participantB = rankedParticipantsB.find(candidate => (
        !usedParticipantBIds.has(candidate.id) &&
        !competitionParticipantsShareUser(participantA, candidate)
      ))

      if (!participantB) continue
      usedParticipantBIds.add(participantB.id)

      allMatchups.push({
        competition_id: competitionId,
        club_a_id: clubA.id,
        club_b_id: clubB.id,
        participant_a_id: participantA.id,
        participant_b_id: participantB.id,
        order_index: orderIndex++,
        round_index: roundIdx,
        status: 'pending',
        locked: false,
      })
    }
  }

  if (allMatchups.length === 0) {
    return {
      matchups: [],
      error: new Error('No matchups were generated. Check that each confirmed club has ranked pairs.'),
    }
  }

  const { data, error } = await supabase
    .from('competition_matchups')
    .insert(allMatchups)
    .select(`
      *,
      participant_a:competition_participants!participant_a_id(*),
      participant_b:competition_participants!participant_b_id(*)
    `)

  const hydrated = await hydrateCompetitionMatchups((data as CompetitionMatchup[]) || [])
  return { matchups: hydrated, error }
}

export async function swapMatchupParticipants(
  matchupId: string,
  newParticipantAId: string,
  newParticipantBId: string
): Promise<{ error: Error | null }> {
  if (newParticipantAId === newParticipantBId) {
    return { error: new Error('A pair cannot play against itself.') }
  }

  const { data: selectedParticipants, error: participantError } = await supabase
    .from('competition_participants')
    .select('id, name, user_1_id, user_2_id')
    .in('id', [newParticipantAId, newParticipantBId])

  if (participantError) return { error: participantError }

  const participantA = (selectedParticipants as ParticipantIdentityRow[] || []).find(p => p.id === newParticipantAId)
  const participantB = (selectedParticipants as ParticipantIdentityRow[] || []).find(p => p.id === newParticipantBId)
  const matchupError = getMatchupParticipantOverlapMessage(participantA, participantB)
  if (matchupError) return { error: new Error(matchupError) }

  const { error } = await supabase
    .from('competition_matchups')
    .update({
      participant_a_id: newParticipantAId,
      participant_b_id: newParticipantBId,
    })
    .eq('id', matchupId)
    .eq('locked', false)

  return { error }
}

export async function startCompetition(
  competitionId: string
): Promise<{ error: Error | null }> {
  const existing = await getCompetitionMatchups(competitionId)
  if (existing.error) return { error: existing.error }

  for (const matchup of existing.matchups) {
    const matchupError = getMatchupParticipantOverlapMessage(matchup.participant_a, matchup.participant_b)
    if (matchupError) {
      return { error: new Error(`Fix Match ${matchup.order_index + 1} before starting: ${matchupError}`) }
    }
  }

  // Lock all matchups and set competition to live
  const { error: lockError } = await supabase
    .from('competition_matchups')
    .update({ locked: true, status: 'live' })
    .eq('competition_id', competitionId)

  if (lockError) return { error: lockError }

  const { error } = await supabase
    .from('competitions')
    .update({ status: 'live' })
    .eq('id', competitionId)

  return { error }
}

export async function getCompetitionMatchups(
  competitionId: string
): Promise<{ matchups: CompetitionMatchup[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competition_matchups')
    .select(`
      *,
      participant_a:competition_participants!participant_a_id(*),
      participant_b:competition_participants!participant_b_id(*)
    `)
    .eq('competition_id', competitionId)
    .order('order_index')

  if (error) return { matchups: [], error }

  const matchups = data as CompetitionMatchup[]

  // Fetch match data (score_sets) separately since there's no FK from
  // competition_matchups.match_id → matches.id, so PostgREST embedding
  // cannot resolve the relationship and would throw PGRST200.
  const matchIds = matchups
    .map(m => m.match_id)
    .filter((id): id is string => Boolean(id))

  if (matchIds.length > 0) {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, score_sets(team1_score, team2_score)')
      .in('id', matchIds)

    const matchMap = new Map((matches || []).map(m => [m.id, m]))
    for (const matchup of matchups) {
      if (matchup.match_id && matchMap.has(matchup.match_id)) {
        matchup.match = matchMap.get(matchup.match_id)
      }
    }
  }

  const hydrated = await hydrateCompetitionMatchups(matchups)
  return { matchups: hydrated, error: null }
}

// ============================================
// SCORING
// ============================================

export async function recordCompetitionMatch(
  matchupId: string,
  matchData: {
    club_id: string
    sport: string
    match_type: 'singles' | 'doubles'
    participants: { user_id: string; team: number }[]
    score_sets: { set_number: number; team1_score: number; team2_score: number }[]
  }
): Promise<{ match: { id: string } | null; error: Error | null }> {
  const { data: matchupDetails } = await supabase
    .from('competition_matchups')
    .select(`
      competition_id,
      participant_a_id,
      participant_b_id,
      participant_a:competition_participants!participant_a_id(id, name, user_1_id, user_2_id),
      participant_b:competition_participants!participant_b_id(id, name, user_1_id, user_2_id)
    `)
    .eq('id', matchupId)
    .single()

  const typedMatchupDetails = matchupDetails as {
    competition_id?: string | null
    participant_a?: ParticipantIdentityRow | null
    participant_b?: ParticipantIdentityRow | null
  } | null
  const competitionId = typedMatchupDetails?.competition_id

  const matchupError = getMatchupParticipantOverlapMessage(
    typedMatchupDetails?.participant_a,
    typedMatchupDetails?.participant_b
  )
  if (matchupError) return { match: null, error: new Error(matchupError) }
  if (!competitionId) return { match: null, error: new Error('Competition matchup not found.') }

  const participantIds = matchData.participants.map(participant => participant.user_id)
  if (new Set(participantIds).size !== participantIds.length) {
    return { match: null, error: new Error('Each player can only appear once in a match.') }
  }

  const userId = await getCurrentUserId()

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      club_id: matchData.club_id,
      sport: matchData.sport,
      match_type: matchData.match_type,
      recorded_by: userId,
      tournament_id: competitionId,
    })
    .select('id')
    .single()

  if (matchError || !match) return { match: null, error: matchError }

  await supabase.from('match_participants').insert(
    matchData.participants.map(p => ({ match_id: match.id, user_id: p.user_id, team: p.team }))
  )

  await supabase.from('score_sets').insert(
    matchData.score_sets.map(s => ({ match_id: match.id, set_number: s.set_number, team1_score: s.team1_score, team2_score: s.team2_score }))
  )

  const team1Wins = matchData.score_sets.filter(s => s.team1_score > s.team2_score).length
  const team2Wins = matchData.score_sets.filter(s => s.team2_score > s.team1_score).length
  const winningTeam = team1Wins > team2Wins ? 1 : 2

  const { data: matchup } = await supabase
    .from('competition_matchups')
    .select('participant_a_id, participant_b_id, club_a_id, club_b_id')
    .eq('id', matchupId)
    .single()

  if (!matchup) return { match, error: null }

  const winnerParticipantId = winningTeam === 1 ? matchup.participant_a_id : matchup.participant_b_id
  const winnerClubId = winningTeam === 1 ? matchup.club_a_id : matchup.club_b_id

  await supabase
    .from('competition_matchups')
    .update({
      match_id: match.id,
      status: 'completed',
      winner_participant_id: winnerParticipantId,
      winner_club_id: winnerClubId,
    })
    .eq('id', matchupId)

  // Notify both pairs' participants
  const { data: participants } = await supabase
    .from('match_participants')
    .select('user_id')
    .in('match_id', [match.id])

  if (participants) {
    const scoreText = matchData.score_sets.map(s => `${s.team1_score}-${s.team2_score}`).join(', ')
    for (const p of participants) {
      if (p.user_id) {
        await supabase.from('notifications').insert({
          user_id: p.user_id,
          type: 'competition_update',
          title: `Match completed`,
          message: `Your rubber finished (${scoreText})`,
          data: { competition_id: competitionId, matchup_id: matchupId },
        })
      }
    }
  }

  // Post to club notice board
  const { data: partA } = await supabase
    .from('competition_participants')
    .select('name, club_id')
    .eq('id', matchup.participant_a_id)
    .single()

  const { data: partB } = await supabase
    .from('competition_participants')
    .select('name, club_id')
    .eq('id', matchup.participant_b_id)
    .single()

  if (partA) {
    const isWinner = winnerParticipantId === matchup.participant_a_id
    const scoreText = matchData.score_sets.map(s => `${s.team1_score}-${s.team2_score}`).join(', ')
    await supabase.from('club_messages').insert({
      club_id: partA.club_id,
      title: isWinner ? '✅ Rubber Won' : '❌ Rubber Lost',
      message: `${partA.name} ${isWinner ? 'beat' : 'lost to'} ${partB?.name || 'opponent'} (${scoreText})`,
      created_by: userId,
    })
  }

  if (partB && partB.club_id !== partA?.club_id) {
    const isWinner = winnerParticipantId === matchup.participant_b_id
    const scoreText = matchData.score_sets.map(s => `${s.team2_score}-${s.team1_score}`).join(', ')
    await supabase.from('club_messages').insert({
      club_id: partB.club_id,
      title: isWinner ? '✅ Rubber Won' : '❌ Rubber Lost',
      message: `${partB.name} ${isWinner ? 'beat' : 'lost to'} ${partA?.name || 'opponent'} (${scoreText})`,
      created_by: userId,
    })
  }

  // Check if all matchups completed
  const { data: remaining } = await supabase
    .from('competition_matchups')
    .select('id')
    .eq('competition_id', competitionId)
    .neq('status', 'completed')

  if (!remaining || remaining.length === 0) {
    await completeCompetition(competitionId)
  }

  return { match: { id: match.id }, error: null }
}

export async function completeCompetition(
  competitionId: string
): Promise<{ competition: Competition | null; error: Error | null }> {
  const { data: matchups } = await supabase
    .from('competition_matchups')
    .select('winner_club_id, club_a_id, club_b_id')
    .eq('competition_id', competitionId)
    .eq('status', 'completed')

  const { data: compDetails } = await supabase
    .from('competitions')
    .select('format, pairs_count')
    .eq('id', competitionId)
    .single()

  if (!compDetails) return { competition: null, error: new Error('Competition not found') }

  let winningClubId: string | null = null

  if (compDetails.format === 'friendly') {
    // Count matchup wins per club for friendly (2 clubs only)
    const clubWins: Record<string, number> = {}
    for (const m of matchups || []) {
      if (m.winner_club_id) clubWins[m.winner_club_id] = (clubWins[m.winner_club_id] || 0) + 1
    }
    winningClubId = Object.entries(clubWins).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // Post winner announcement to club notice boards
    const { data: cc } = await supabase
      .from('competition_clubs')
      .select('club_id, club:clubs!club_id(name)')
      .eq('competition_id', competitionId)

    const winningClubName = normalizeClubData(cc?.find(c => c.club_id === winningClubId)?.club)?.name

    for (const club of cc || []) {
      const isWinner = club.club_id === winningClubId
      await supabase.from('club_messages').insert({
        club_id: club.club_id,
        title: isWinner ? 'Competition Won!' : 'Competition Completed',
        message: isWinner
          ? `Your club won the friendly!`
          : `${winningClubName || 'The other club'} won the friendly. Well played!`,
        created_by: (await getCurrentUserId()) || undefined,
      })
    }
  } else {
    // League: count TIE wins (which club won more rubbers in each club-vs-club pairing)
    const tieWins: Record<string, number> = {}
    const clubIds = new Set<string>()
    for (const m of matchups || []) {
      if (m.club_a_id) clubIds.add(m.club_a_id)
      if (m.club_b_id) clubIds.add(m.club_b_id)
    }
    // Group matchups by club pair (a-b sorted)
    const ties = new Map<string, { clubA: string; clubB: string; aWins: number; bWins: number }>()
    for (const m of matchups || []) {
      if (!m.club_a_id || !m.club_b_id) continue
      const key = [m.club_a_id, m.club_b_id].sort().join('-')
      if (!ties.has(key)) {
        ties.set(key, { clubA: m.club_a_id, clubB: m.club_b_id, aWins: 0, bWins: 0 })
      }
      const t = ties.get(key)!
      if (m.winner_club_id === m.club_a_id) t.aWins++
      else if (m.winner_club_id === m.club_b_id) t.bWins++
    }
    // Count tie wins for each club
    for (const t of ties.values()) {
      if (t.aWins > t.bWins) tieWins[t.clubA] = (tieWins[t.clubA] || 0) + 1
      else if (t.bWins > t.aWins) tieWins[t.clubB] = (tieWins[t.clubB] || 0) + 1
    }
    winningClubId = Object.entries(tieWins).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  }

  const { data, error } = await supabase
    .from('competitions')
    .update({
      status: 'completed',
      winning_club_id: winningClubId,
    })
    .eq('id', competitionId)
    .select('*, club:clubs!club_id(id, name, city, logo_url)')
    .single()

  return { competition: data as Competition | null, error }
}

// ============================================
// LEAGUE STANDINGS
// ============================================

export async function getLeagueStandings(
  competitionId: string
): Promise<{
  standings: {
    clubId: string
    clubName: string
    played: number
    won: number
    lost: number
    rubbersWon: number
    rubbersLost: number
  }[]
  error: Error | null
}> {
  const { data: clubs } = await supabase
    .from('competition_clubs')
    .select('id, club_id, club:clubs!club_id(name)')
    .eq('competition_id', competitionId)
    .eq('status', 'confirmed')

  if (!clubs) return { standings: [], error: null }

  const { data: matchups } = await supabase
    .from('competition_matchups')
    .select('club_a_id, club_b_id, winner_participant_id, participant_a_id, participant_b_id, status')
    .eq('competition_id', competitionId)

  // Fetch all participants in one query for in-memory lookups
  const { data: allParticipants } = await supabase
    .from('competition_participants')
    .select('id, club_id')
    .eq('competition_id', competitionId)

  const participantClubMap = new Map((allParticipants || []).map(p => [p.id, p.club_id]))

  const standings = clubs.map(cc => {
    const clubMatches = (matchups || []).filter(
      m => (m.club_a_id === cc.id || m.club_b_id === cc.id) && m.status === 'completed'
    )

    let rubbersWon = 0
    let rubbersLost = 0

    for (const m of clubMatches) {
      const aClubId = participantClubMap.get(m.participant_a_id)
      const bClubId = participantClubMap.get(m.participant_b_id)
      const aWon = m.winner_participant_id === m.participant_a_id
      const clubIsA = aClubId === cc.club_id
      const clubIsB = bClubId === cc.club_id

      if ((clubIsA && aWon) || (clubIsB && !aWon)) {
        rubbersWon++
      } else if (clubIsA || clubIsB) {
        rubbersLost++
      }
    }

    // Count tie-level wins: which club won more rubbers against each opponent
    const tieWinsByOpponent = new Map<string, { tiesWon: number; tiesLost: number }>()
    for (const m of clubMatches) {
      const opponentClubId = m.club_a_id === cc.id ? m.club_b_id : m.club_a_id
      if (!opponentClubId) continue

      if (!tieWinsByOpponent.has(opponentClubId)) {
        tieWinsByOpponent.set(opponentClubId, { tiesWon: 0, tiesLost: 0 })
      }
    }

    // For each opponent, count club's rubber wins vs that opponent
    for (const [opponentId] of tieWinsByOpponent) {
      const vsMatches = clubMatches.filter(m => {
        const opp = m.club_a_id === cc.id ? m.club_b_id : m.club_a_id
        return opp === opponentId
      })
      const clubRubberWins = vsMatches.filter(m => {
        const aClubId = participantClubMap.get(m.participant_a_id)
        const bClubId = participantClubMap.get(m.participant_b_id)
        const aWon = m.winner_participant_id === m.participant_a_id
        const clubIsA = aClubId === cc.club_id
        const clubIsB = bClubId === cc.club_id
        return (clubIsA && aWon) || (clubIsB && !aWon)
      }).length
      const clubRubberLosses = vsMatches.length - clubRubberWins

      if (clubRubberWins > clubRubberLosses) {
        tieWinsByOpponent.get(opponentId)!.tiesWon++
      } else if (clubRubberLosses > clubRubberWins) {
        tieWinsByOpponent.get(opponentId)!.tiesLost++
      }
    }

    let won = 0
    let lost = 0
    for (const { tiesWon, tiesLost } of tieWinsByOpponent.values()) {
      won += tiesWon
      lost += tiesLost
    }

    const clubName = normalizeClubData(cc.club)?.name || 'Unknown'

    return {
      clubId: cc.club_id,
      clubName,
      played: tieWinsByOpponent.size,
      won,
      lost,
      rubbersWon,
      rubbersLost,
    }
  })

  return { standings, error: null }
}

// ============================================
// STATS
// ============================================

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

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToCompetition(
  competitionId: string,
  callback: (payload: { new: Competition }) => void
) {
  return supabase
    .channel(`competition:${competitionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'competitions', filter: `id=eq.${competitionId}` },
      (payload) => callback(payload as unknown as { new: Competition })
    )
    .subscribe()
}

export function subscribeToCompetitionMatchups(
  competitionId: string,
  callback: (payload: { new: CompetitionMatchup }) => void
) {
  return supabase
    .channel(`competition-matchups:${competitionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'competition_matchups', filter: `competition_id=eq.${competitionId}` },
      (payload) => callback(payload as unknown as { new: CompetitionMatchup })
    )
    .subscribe()
}

// ============================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================
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

export {
  respondToCompetitionInvite as acceptFriendly,
  getCompetition as getFriendly,
  getCompetitionByInviteCode as getFriendlyByInviteCode,
  listClubCompetitions as listClubFriendlies,
  registerCompetitionParticipants as registerPairs,
  getCompetitionParticipants as getFriendlyPairs,
  getCompetitionMatchups as getFriendlyMatchups,
  recordCompetitionMatch as recordFriendlyMatch,
  completeCompetition as completeFriendly,
  cancelCompetition as cancelFriendly,
  getClubCompetitionStats as getClubFriendlyStats,
  subscribeToCompetition as subscribeToFriendly,
  subscribeToCompetitionMatchups as subscribeToMatchups,
}
