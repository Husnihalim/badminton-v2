import { useQuery } from '@tanstack/react-query'
import { 
  getClub, 
  getClubEvents, 
  getClubMatchesPaginated, 
  getClubLeaderboard, 
  getMyMembership, 
  getSpecificInviteLinks,
  getClubMembers,
  getClubMessages,
  getMyEventRsvps,
  getEventRsvps,
  getClubMatches
} from '../../../lib/api'

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

export const useMyMembership = (clubId?: string, isUserAuthenticated = false) => useQuery({
  queryKey: ['clubs', clubId, 'membership'],
  queryFn: () => getMyMembership(clubId!),
  enabled: !!clubId && isUserAuthenticated,
})

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

export const useMyRsvps = (isUserAuthenticated = false) => useQuery({
  queryKey: ['rsvps', 'my'],
  queryFn: () => getMyEventRsvps(),
  enabled: isUserAuthenticated,
})

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


