import { supabase } from '../supabase'
import type { Competition, CompetitionMatchup, CompetitionParticipant } from '../../types/competition'
import {
  competitionParticipantsShareUser,
  getMatchupParticipantOverlapMessage,
  type CompetitionParticipantIdentity,
} from '../competitionIntegrity'
import {
  getClubName,
  getCompetitionClubRows,
  postCompetitionNotice,
  postCompetitionNoticeToConfirmedClubs,
} from './competitions-announcements'

type ParticipantIdentityRow = CompetitionParticipantIdentity & {
  id: string
  rank?: number | null
}

function normalizeClubData(data: unknown) {
  if (!data) return null
  return Array.isArray(data) ? data[0] : data
}

async function getCurrentUserId(): Promise<string | null> {
  return (await supabase.auth.getUser()).data.user?.id || null
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

  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile as { id: string; name: string; display_name: string | null; avatar_url: string | null }]))

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
    .select('title, pairs_count')
    .eq('id', competitionId)
    .single()

  if (!comp) return { matchups: [], error: new Error('Competition not found') }

  const pairCount = comp.pairs_count || 5

  const { data: clubs } = await supabase
    .from('competition_clubs')
    .select('id, club_id')
    .eq('competition_id', competitionId)
    .eq('status', 'confirmed')
    .eq('lineup_confirmed', true)

  if (!clubs || clubs.length < 2) {
    return { matchups: [], error: new Error('Need at least 2 confirmed clubs') }
  }

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
  await postCompetitionNoticeToConfirmedClubs(
    competitionId,
    'Match schedule ready',
    `${hydrated.length} matches have been generated for "${comp.title || 'the competition'}". Check the competition page for pairings.`,
    { competitionId, competition_id: competitionId }
  )
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

  const { error: lockError } = await supabase
    .from('competition_matchups')
    .update({ locked: true, status: 'live' })
    .eq('competition_id', competitionId)

  if (lockError) return { error: lockError }

  const { error } = await supabase
    .from('competitions')
    .update({ status: 'live' })
    .eq('id', competitionId)

  if (!error) {
    const { data: competition } = await supabase
      .from('competitions')
      .select('title')
      .eq('id', competitionId)
      .maybeSingle()

    await postCompetitionNoticeToConfirmedClubs(
      competitionId,
      'Competition is live',
      `"${competition?.title || 'The competition'}" is now live. Scores can be recorded from the competition page.`,
      { competitionId, competition_id: competitionId }
    )
  }

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

  const team1Wins = matchData.score_sets.filter(s => s.team1_score > s.team2_score).length
  const team2Wins = matchData.score_sets.filter(s => s.team2_score > s.team1_score).length
  if (team1Wins === team2Wins) {
    return { match: null, error: new Error('A competition match needs a winner.') }
  }
  const winningTeam = team1Wins > team2Wins ? 1 : 2

  const userId = await getCurrentUserId()

  const { data: match, error: rpcError } = await supabase.rpc('record_competition_match', {
    p_matchup_id: matchupId,
    p_club_id: matchData.club_id,
    p_sport: matchData.sport,
    p_match_type: matchData.match_type,
    p_date: new Date().toISOString().split('T')[0],
    p_competition_id: competitionId,
    p_participants: matchData.participants.map(p => ({ user_id: p.user_id, team: p.team })),
    p_score_sets: matchData.score_sets.map(s => ({ set_number: s.set_number, team1_score: s.team1_score, team2_score: s.team2_score }))
  })

  if (rpcError || !match) return { match: null, error: rpcError }

  const { data: matchup } = await supabase
    .from('competition_matchups')
    .select('participant_a_id, participant_b_id, club_a_id, club_b_id')
    .eq('id', matchupId)
    .single()

  if (!matchup) return { match, error: null }

  const winnerParticipantId = winningTeam === 1 ? matchup.participant_a_id : matchup.participant_b_id
  const winnerClubId = winningTeam === 1 ? matchup.club_a_id : matchup.club_b_id

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
          title: 'Match completed',
          message: `Your match finished (${scoreText})`,
          data: { competition_id: competitionId, matchup_id: matchupId },
        })
      }
    }
  }

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
    await postCompetitionNotice({
      competitionId,
      clubIds: [partA.club_id],
      title: isWinner ? 'Match won' : 'Match lost',
      message: `${partA.name} ${isWinner ? 'beat' : 'lost to'} ${partB?.name || 'opponent'} (${scoreText})`,
      data: { competitionId, competition_id: competitionId, matchupId, matchup_id: matchupId, matchId: match.id },
    })
  }

  if (partB && partB.club_id !== partA?.club_id) {
    const isWinner = winnerParticipantId === matchup.participant_b_id
    const scoreText = matchData.score_sets.map(s => `${s.team2_score}-${s.team1_score}`).join(', ')
    await postCompetitionNotice({
      competitionId,
      clubIds: [partB.club_id],
      title: isWinner ? 'Match won' : 'Match lost',
      message: `${partB.name} ${isWinner ? 'beat' : 'lost to'} ${partA?.name || 'opponent'} (${scoreText})`,
      data: { competitionId, competition_id: competitionId, matchupId, matchup_id: matchupId, matchId: match.id },
    })
  }

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
    const clubWins: Record<string, number> = {}
    for (const m of matchups || []) {
      if (m.winner_club_id) clubWins[m.winner_club_id] = (clubWins[m.winner_club_id] || 0) + 1
    }
    winningClubId = Object.entries(clubWins).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  } else {
    const tieWins: Record<string, number> = {}
    const clubIds = new Set<string>()
    for (const m of matchups || []) {
      if (m.club_a_id) clubIds.add(m.club_a_id)
      if (m.club_b_id) clubIds.add(m.club_b_id)
    }
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

  if (!error && data) {
    const competitionClubs = await getCompetitionClubRows(competitionId)
    const winningClub = competitionClubs.find(club => club.id === winningClubId || club.club_id === winningClubId)
    const winningClubName = winningClubId ? getClubName(winningClub, 'The winner') : null

    await postCompetitionNoticeToConfirmedClubs(
      competitionId,
      winningClubName ? 'Competition winner announced' : 'Competition completed',
      winningClubName
        ? `${winningClubName} won "${data.title || 'the competition'}". Well played by all clubs.`
        : `"${data.title || 'The competition'}" is complete. Well played by all clubs.`,
      { competitionId, competition_id: competitionId, winningClubId }
    )
  }

  return { competition: data as Competition | null, error }
}

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

    const tieWinsByOpponent = new Map<string, { tiesWon: number; tiesLost: number }>()
    for (const m of clubMatches) {
      const opponentClubId = m.club_a_id === cc.id ? m.club_b_id : m.club_a_id
      if (!opponentClubId) continue

      if (!tieWinsByOpponent.has(opponentClubId)) {
        tieWinsByOpponent.set(opponentClubId, { tiesWon: 0, tiesLost: 0 })
      }
    }

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
