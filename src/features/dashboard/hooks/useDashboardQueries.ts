import { useQuery, useQueries } from '@tanstack/react-query'
import { getPlayerDashboard, getClubs, getClubMatches, getClubMembers } from '../../../lib/api'

export const usePlayerDashboard = (userId?: string) => useQuery({
  queryKey: ['dashboard', userId],
  queryFn: () => getPlayerDashboard(userId!),
  enabled: !!userId,
})

export const useDiscoverClubs = (isUserAuthenticated = false) => useQuery({
  queryKey: ['clubs', 'discoverable'],
  queryFn: () => getClubs(),
  enabled: isUserAuthenticated,
})

export const useClubsMatches = (clubIds: string[] = []) => useQueries({
  queries: clubIds.map((clubId) => ({
    queryKey: ['clubs', clubId, 'matches', 'all'],
    queryFn: () => getClubMatches(clubId),
    enabled: !!clubId,
    staleTime: 30_000,
  })),
})

export const useClubsMembers = (clubIds: string[] = []) => useQueries({
  queries: clubIds.map((clubId) => ({
    queryKey: ['clubs', clubId, 'members'],
    queryFn: () => getClubMembers(clubId),
    enabled: !!clubId,
    staleTime: 30_000,
  })),
})

