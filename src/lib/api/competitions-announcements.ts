import { supabase } from '../supabase'
import { notifyClubMembers } from './notifications'

type CompetitionClubRow = {
  id: string
  club_id: string
  status?: string | null
  club?: { name: string | null } | { name: string | null }[] | null
}

type CompetitionNoticeInput = {
  competitionId: string
  clubIds: string[]
  title: string
  message: string
  data?: Record<string, unknown>
  actorFallback?: string
}

function normalizeClubData(data: CompetitionClubRow['club']) {
  if (!data) return null
  return Array.isArray(data) ? data[0] : data
}

async function getCurrentUserId(): Promise<string | null> {
  return (await supabase.auth.getUser()).data.user?.id || null
}

export async function getCompetitionClubRows(
  competitionId: string,
  confirmedOnly = true
): Promise<CompetitionClubRow[]> {
  let query = supabase
    .from('competition_clubs')
    .select('id, club_id, status, club:clubs!club_id(name)')
    .eq('competition_id', competitionId)

  if (confirmedOnly) {
    query = query.eq('status', 'confirmed')
  }

  const { data, error } = await query
  if (error) {
    console.error('Error loading competition clubs for announcement:', error)
    return []
  }

  return (data || []) as CompetitionClubRow[]
}

export function getClubName(row: CompetitionClubRow | undefined, fallback = 'Club') {
  return normalizeClubData(row?.club)?.name || fallback
}

export async function postCompetitionNotice(input: CompetitionNoticeInput): Promise<void> {
  const userId = await getCurrentUserId()
  const clubIds = Array.from(new Set(input.clubIds.filter(Boolean)))

  for (const clubId of clubIds) {
    const { data: messageRow, error: messageError } = await supabase
      .from('club_messages')
      .insert({
        club_id: clubId,
        title: input.title,
        message: input.message,
        created_by: userId,
      })
      .select('id')
      .single()

    if (messageError) {
      console.error('Error posting competition noticeboard message:', messageError)
      continue
    }

    try {
      await notifyClubMembers({
        clubId,
        type: 'announcement',
        title: input.title,
        message: input.message,
        data: {
          ...(input.data || {}),
          clubId,
          competitionId: input.competitionId,
          competition_id: input.competitionId,
          messageId: messageRow?.id,
        },
        activityTitle: input.title,
        activityDescription: input.message,
        actorFallback: input.actorFallback || 'Competition admin',
      })
    } catch (notificationError) {
      console.error('Error notifying members about competition notice:', notificationError)
    }
  }
}

export async function postCompetitionNoticeToConfirmedClubs(
  competitionId: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  const clubs = await getCompetitionClubRows(competitionId)
  await postCompetitionNotice({
    competitionId,
    clubIds: clubs.map(club => club.club_id),
    title,
    message,
    data,
  })
}
