export type CompetitionParticipantIdentity = {
  id?: string | null
  name?: string | null
  user_1_id?: string | null
  user_2_id?: string | null
}

export function getCompetitionParticipantUserIds(participant?: CompetitionParticipantIdentity | null): string[] {
  if (!participant) return []
  return [participant.user_1_id, participant.user_2_id].filter((id): id is string => Boolean(id))
}

export function competitionParticipantHasDuplicatePlayer(
  participant?: CompetitionParticipantIdentity | null
): boolean {
  if (!participant?.user_1_id || !participant.user_2_id) return false
  return participant.user_1_id === participant.user_2_id
}

export function competitionParticipantsShareUser(
  participantA?: CompetitionParticipantIdentity | null,
  participantB?: CompetitionParticipantIdentity | null
): boolean {
  const userIdsA = new Set(getCompetitionParticipantUserIds(participantA))
  return getCompetitionParticipantUserIds(participantB).some(userId => userIdsA.has(userId))
}

export function getCompetitionParticipantLabel(participant?: CompetitionParticipantIdentity | null): string {
  return participant?.name?.trim() || 'A pair'
}

export function getDuplicateCompetitionUserMessage(
  participants: CompetitionParticipantIdentity[]
): string | null {
  const seenByUserId = new Map<string, CompetitionParticipantIdentity>()

  for (const participant of participants) {
    if (competitionParticipantHasDuplicatePlayer(participant)) {
      return `${getCompetitionParticipantLabel(participant)} uses the same player twice.`
    }

    for (const userId of getCompetitionParticipantUserIds(participant)) {
      const existingParticipant = seenByUserId.get(userId)
      if (existingParticipant && existingParticipant.id !== participant.id) {
        return `${getCompetitionParticipantLabel(participant)} shares a player with ${getCompetitionParticipantLabel(existingParticipant)}. Each player can only appear once in a competition.`
      }
      seenByUserId.set(userId, participant)
    }
  }

  return null
}

export function getMatchupParticipantOverlapMessage(
  participantA?: CompetitionParticipantIdentity | null,
  participantB?: CompetitionParticipantIdentity | null
): string | null {
  if (!participantA || !participantB) return 'Both sides need a valid pair before this matchup can be used.'
  if (participantA.id && participantA.id === participantB.id) {
    return 'A pair cannot play against itself.'
  }
  if (competitionParticipantsShareUser(participantA, participantB)) {
    return `${getCompetitionParticipantLabel(participantA)} and ${getCompetitionParticipantLabel(participantB)} share a player. Choose different pairs before recording this match.`
  }
  return null
}

