import { supabase } from '../supabase'
import type { 
  Match, 
  MatchWithDetails, 
  EloHistory, 
  User, 
  MatchParticipant, 
  ScoreSet, 
  MatchReaction, 
  MatchComment 
} from '../../types'
import { mockMatches, mockLeaderboards, mockEloHistories } from '../mockShowcase'
import { getErrorMessage, isMissingRpcFunctionError } from '../utils'
import { notifyClubMembers } from './notifications'

export type ClubLeaderboardRow = {
  name: string
  games: number
  wins: number
  losses: number
  winPercentage: number
  pointsFor: number
  pointsAgainst: number
  points: number
  elo_rating?: number
}

type ProfileSummary = {
  name?: string | null
  email?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

type MatchParticipantQueryRow = MatchParticipant & {
  guest_name: string | null
  profiles?: User | null
}

type MatchReactionQueryRow = MatchReaction & {
  profiles?: ProfileSummary | null
}

type MatchCommentQueryRow = MatchComment & {
  profiles?: ProfileSummary | null
}

type EloHistoryQueryRow = EloHistory & {
  matches?: {
    title?: string | null
    match_date?: string | null
    created_at?: string | null
  } | null
}

type MatchQueryRow = Match & {
  match_participants?: MatchParticipantQueryRow[] | null
  score_sets?: ScoreSet[] | null
  match_reactions?: MatchReactionQueryRow[] | null
  match_comments?: MatchCommentQueryRow[] | null
  recorded_by_profile?: ProfileSummary | null
}

export interface CreateMatchData {
  club_id: string
  title?: string
  sport: string
  match_type: 'singles' | 'doubles'
  match_date?: string
  event_id?: string
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

async function postMatchAnnouncement(data: CreateMatchData, userId: string) {
  try {
    const userIds = data.participants
      .map((p) => p.user_id)
      .filter((id): id is string => !!id)

    const profileNamesMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)

      if (!error && profiles) {
        profiles.forEach((p) => {
          profileNamesMap[p.id] = p.name || 'Club member'
        })
      }
    }

    const getPlayerName = (p: typeof data.participants[0]) => {
      if (p.is_guest) return p.guest_name || 'Guest'
      if (p.user_id) return profileNamesMap[p.user_id] || 'Club member'
      return 'Unknown Player'
    }

    const t1Sets = data.score_sets.filter((s) => s.team1_score > s.team2_score).length
    const t2Sets = data.score_sets.filter((s) => s.team2_score > s.team1_score).length
    
    const winningTeam = t1Sets > t2Sets ? 1 : (t2Sets > t1Sets ? 2 : 1)
    const losingTeam = winningTeam === 1 ? 2 : 1

    const winners = data.participants.filter((p) => p.team === winningTeam).map(getPlayerName)
    const losers = data.participants.filter((p) => p.team === losingTeam).map(getPlayerName)

    const winnersText = winners.join(' & ')
    const losersText = losers.join(' & ')

    const scoreText = data.score_sets
      .map((s) => `${s.team1_score}-${s.team2_score}`)
      .join(', ')

    const announcementMessage = `${winnersText} beat ${losersText} (${scoreText})`

    await supabase.from('club_messages').insert({
      club_id: data.club_id,
      title: '🎉 Match Completed',
      message: announcementMessage,
      created_by: userId,
    })
  } catch (err) {
    console.error('Failed to post match announcement:', err)
  }
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
    event_id: data.event_id || null,
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

  await postMatchAnnouncement(data, user.id)

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
    match_event_id: data.event_id || null,
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

  // Run winner name calculations and notification formatting asynchronously
  // to avoid blocking the main UI response flow.
  ;(async () => {
    try {
      let team1Wins = 0
      let team2Wins = 0
      data.score_sets.forEach((set) => {
        if (set.team1_score > set.team2_score) team1Wins++
        if (set.team2_score > set.team1_score) team2Wins++
      })
      const winnerTeam = team1Wins > team2Wins ? 1 : (team2Wins > team1Wins ? 2 : null)

      let winnerNames = ''
      if (winnerTeam) {
        const winnerParticipants = data.participants.filter(p => p.team === winnerTeam)
        const names = await Promise.all(winnerParticipants.map(async (p) => {
          if (p.is_guest) {
            return p.guest_name || 'Guest'
          } else if (p.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, name')
              .eq('id', p.user_id)
              .maybeSingle()
            const profileData = profile as { display_name?: string | null; name?: string | null } | null
            return profileData?.display_name || profileData?.name || 'Member'
          }
          return 'Player'
        }))
        winnerNames = names.join(' & ')
      }

      const scoreText = data.score_sets.map((set) => `${set.team1_score}-${set.team2_score}`).join(', ')
      const notificationTitle = winnerNames ? '🏆 Match Won!' : 'New match score recorded'
      const notificationMessage = winnerNames
        ? `🎉 ${winnerNames} won the match! Score: ${scoreText}`
        : `${createdMatch.title || `${createdMatch.sport} match`} score was added: ${scoreText}.`

      await notifyClubMembers({
        clubId: data.club_id,
        type: 'score_recorded',
        title: notificationTitle,
        message: notificationMessage,
        data: { clubId: data.club_id, matchId: createdMatch.id },
        activityTitle: notificationTitle,
        activityDescription: notificationMessage,
        actorFallback: 'Club member',
      })
    } catch (notificationError) {
      console.error('Error sending score notifications:', notificationError)
    }
  })()

  await postMatchAnnouncement(data, user.id)

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
      if (!participant.profiles) continue // Exclude guest players from the leaderboard
      const name = participant.profiles.display_name || participant.profiles.name || 'Unknown'
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
    .sort((a, b) => b.winPercentage - a.winPercentage || b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name))
    .slice(0, Math.max(limit, 1))
}

export async function getClubLeaderboard(clubId: string, limit = 10): Promise<ClubLeaderboardRow[]> {
  if (clubId && clubId.startsWith('mock-')) {
    return (mockLeaderboards[clubId] || []).slice(0, limit)
  }
  const { data, error } = await supabase.rpc('get_club_leaderboard', {
    target_club_id: clubId,
    row_limit: limit,
  })

  if (error) {
    const isMissingRpc = isMissingRpcFunctionError(error, 'get_club_leaderboard')
    if (isMissingRpc) {
      console.warn('Falling back to direct SQL queries because get_club_leaderboard RPC is unavailable.')
      return getClubLeaderboardQuery(clubId, limit)
    }
    console.error('Error fetching leaderboard:', error)
    return []
  }

  const result = (data as unknown as Array<{
    player_name: string
    games_played: number
    wins: number
    losses: number
    win_percentage: number
    points_for: number
    points_against: number
    points_diff: number
    elo_rating?: number
  }>) || []

  return result.map((r) => ({
    name: r.player_name,
    games: r.games_played,
    wins: r.wins,
    losses: r.losses,
    winPercentage: r.win_percentage,
    pointsFor: r.points_for,
    pointsAgainst: r.points_against,
    points: r.points_diff,
    elo_rating: r.elo_rating,
  }))
}

export async function getClubMatches(clubId: string): Promise<MatchWithDetails[]> {
  if (clubId && clubId.startsWith('mock-')) {
    return mockMatches[clubId] || []
  }
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      match_participants(
        *,
        profiles(name, display_name, avatar_url)
      ),
      score_sets(*),
      match_reactions(
        *,
        profiles(name, display_name)
      ),
      match_comments(
        *,
        profiles(name, display_name, avatar_url)
      ),
      recorded_by_profile:profiles!recorded_by(name, display_name)
    `)
    .eq('club_id', clubId)
    .order('match_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching club matches:', error)
    return []
  }

  const rows = (data || []) as unknown as MatchQueryRow[]

  return rows.map((match) => {
    const participants = (match.match_participants || []).map((p) => ({
      ...p,
      name: p.profiles?.display_name || p.profiles?.name || p.guest_name || 'Guest',
      profile: p.profiles || null,
    })) as MatchParticipant[]
    const reactions = (match.match_reactions || []).map((r) => ({
      ...r,
      name: r.profiles?.name || 'Member',
      display_name: r.profiles?.display_name || r.profiles?.name || 'Member',
    }))
    const comments = (match.match_comments || []).map((c) => ({
      ...c,
      name: c.profiles?.name || 'Member',
      display_name: c.profiles?.display_name || c.profiles?.name || 'Member',
      avatar_url: c.profiles?.avatar_url || null,
    }))
    return {
      ...(match as Match),
      participants,
      score_sets: (match.score_sets || []).sort((a, b) => a.set_number - b.set_number),
      reactions,
      comments,
      recorded_by_profile: match.recorded_by_profile
        ? {
            name: match.recorded_by_profile.name,
            display_name: match.recorded_by_profile.display_name,
          }
        : null,
    }
  })
}

export async function getClubMatchesPaginated(
  clubId: string,
  page = 0,
  pageSize = 10
): Promise<MatchWithDetails[]> {
  if (clubId && clubId.startsWith('mock-')) {
    const from = page * pageSize
    const to = from + pageSize - 1
    return (mockMatches[clubId] || []).slice(from, to + 1)
  }
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      match_participants(
        *,
        profiles(name, display_name, avatar_url)
      ),
      score_sets(*),
      match_reactions(
        *,
        profiles(name, display_name)
      ),
      match_comments(
        *,
        profiles(name, display_name, avatar_url)
      ),
      recorded_by_profile:profiles!recorded_by(name, display_name)
    `)
    .eq('club_id', clubId)
    .order('match_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching club matches paginated:', error)
    return []
  }

  const rows = (data || []) as unknown as MatchQueryRow[]

  return rows.map((match) => {
    const participants = (match.match_participants || []).map((p) => ({
      ...p,
      name: p.profiles?.display_name || p.profiles?.name || p.guest_name || 'Guest',
      profile: p.profiles || null,
    })) as MatchParticipant[]
    const reactions = (match.match_reactions || []).map((r) => ({
      ...r,
      name: r.profiles?.name || 'Member',
      display_name: r.profiles?.display_name || r.profiles?.name || 'Member',
    }))
    const comments = (match.match_comments || []).map((c) => ({
      ...c,
      name: c.profiles?.name || 'Member',
      display_name: c.profiles?.display_name || c.profiles?.name || 'Member',
      avatar_url: c.profiles?.avatar_url || null,
    }))
    return {
      ...(match as Match),
      participants,
      score_sets: (match.score_sets || []).sort((a, b) => a.set_number - b.set_number),
      reactions,
      comments,
      recorded_by_profile: match.recorded_by_profile
        ? {
            name: match.recorded_by_profile.name,
            display_name: match.recorded_by_profile.display_name,
          }
        : null,
    }
  })
}

export async function toggleMatchReaction(matchId: string, reaction: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be authenticated to react')

  const { data: existing, error: fetchError } = await supabase
    .from('match_reactions')
    .select('id')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .eq('reaction', reaction)
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching reaction:', fetchError)
    throw fetchError
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from('match_reactions')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      console.error('Error deleting reaction:', deleteError)
      throw deleteError
    }
  } else {
    const { error: insertError } = await supabase
      .from('match_reactions')
      .insert({
        match_id: matchId,
        user_id: user.id,
        reaction
      } as never)

    if (insertError) {
      console.error('Error inserting reaction:', insertError)
      throw insertError
    }
  }
}

export async function addMatchComment(matchId: string, content: string): Promise<MatchComment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be authenticated to comment')

  const { data, error } = await supabase
    .from('match_comments')
    .insert({
      match_id: matchId,
      user_id: user.id,
      content: content.trim()
    } as never)
    .select('*, profiles(name, display_name, avatar_url)')
    .single()

  if (error) {
    console.error('Error adding comment:', error)
    throw error
  }

  const row = data as unknown as MatchCommentQueryRow
  return {
    ...row,
    name: row.profiles?.name || 'Member',
    display_name: row.profiles?.display_name || row.profiles?.name || 'Member',
    avatar_url: row.profiles?.avatar_url || null,
  }
}

export async function deleteMatchComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('match_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error)
    throw error
  }
}

export async function getMemberEloHistory(clubId: string, userId: string): Promise<EloHistory[]> {
  if (clubId && clubId.startsWith('mock-') && userId && userId.startsWith('mock-')) {
    return mockEloHistories[userId] || []
  }
  const { data: member, error: memberError } = await supabase
    .from('memberships')
    .select('id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError || !member) {
    console.error('Error fetching membership for Elo history:', memberError)
    return []
  }

  const { data, error } = await supabase
    .from('elo_history')
    .select(`
      *,
      matches(title, match_date, created_at)
    `)
    .eq('membership_id', member.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching Elo history:', error)
    return []
  }

  return ((data || []) as unknown as EloHistoryQueryRow[]).map((row) => ({
    id: row.id,
    membership_id: row.membership_id,
    match_id: row.match_id,
    rating_before: row.rating_before,
    rating_after: row.rating_after,
    created_at: row.created_at,
    match_title: row.matches?.title || 'Match',
    match_date: row.matches?.match_date || row.matches?.created_at || row.created_at
  }))
}
