import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../context/AuthContext'
import { getClub, getMyMembership, getSpecificInviteLinks, getClubMembers, getClubMessages } from '../../../lib/api/clubs'
import { getClubEvents, getMyEventRsvps, getEventRsvps } from '../../../lib/api/events'
import { getClubLeaderboard, getClubMatchesPaginated, getClubMatches } from '../../../lib/api/matches'

export const useClub = (clubId?: string) => useQuery({
  queryKey: ['clubs', clubId],
  queryFn: () => getClub(clubId!),
  enabled: !!clubId,
})

export const useClubEvents = (clubId?: string) => useQuery({
  queryKey: ['clubs', clubId, 'events'],
  queryFn: () => getClubEvents(clubId!),
  enabled: !!clubId,
})

export const useClubMatches = (clubId?: string, page = 0, pageSize = 10) => useQuery({
  queryKey: ['clubs', clubId, 'matches', page, pageSize],
  queryFn: () => getClubMatchesPaginated(clubId!, page, pageSize),
  enabled: !!clubId,
})

export const useClubLeaderboard = (clubId?: string, limit = 100) => useQuery({
  queryKey: ['clubs', clubId, 'leaderboard', limit],
  queryFn: () => getClubLeaderboard(clubId!, limit),
  enabled: !!clubId,
})

export const useMyMembership = (clubId?: string, isUserAuthenticated = false) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['clubs', clubId, 'membership', user?.id],
    queryFn: () => getMyMembership(clubId!),
    enabled: !!clubId && isUserAuthenticated && !!user,
  })
}

export const useSpecificInviteLinks = (clubId?: string, isAuthorized = false) => useQuery({
  queryKey: ['clubs', clubId, 'specific-invites'],
  queryFn: () => getSpecificInviteLinks(clubId!),
  enabled: !!clubId && isAuthorized,
})

export const useClubMembers = (clubId?: string) => useQuery({
  queryKey: ['clubs', clubId, 'members'],
  queryFn: () => getClubMembers(clubId!),
  enabled: !!clubId,
})

export const useClubMessages = (clubId?: string) => useQuery({
  queryKey: ['clubs', clubId, 'messages'],
  queryFn: () => getClubMessages(clubId!),
  enabled: !!clubId,
})

export const useMyRsvps = (isUserAuthenticated = false) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rsvps', 'my', user?.id],
    queryFn: () => getMyEventRsvps(),
    enabled: isUserAuthenticated && !!user,
  })
}

export const useEventRsvps = (eventId?: string) => useQuery({
  queryKey: ['rsvps', 'event', eventId],
  queryFn: () => getEventRsvps(eventId!),
  enabled: !!eventId,
})

export const useAllClubMatches = (clubId?: string) => useQuery({
  queryKey: ['clubs', clubId, 'matches', 'all'],
  queryFn: () => getClubMatches(clubId!),
  enabled: !!clubId,
})


