import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import {
  rsvpToEvent,
  adminUpdateEventRsvp,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../../lib/api/events'
import {
  createMatch,
  updateMatch,
  deleteMatch,
  type CreateMatchData,
  type UpdateMatchScoreData,
} from '../../lib/api/matches'
import {
  requestJoinClub,
  updateClub,
  regenerateInviteLink,
  createSpecificInviteLink,
  revokeSpecificInviteLink,
  createClubAnnouncement,
  updateClubMessage,
  deleteClubMessage,
} from '../../lib/api/clubs'
import type { EventRsvp, ClubEvent } from '../../types'

export const useRsvpToEvent = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: EventRsvp['status'] }) =>
      rsvpToEvent(eventId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rsvps', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['rsvps', 'event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}

export const useAdminUpdateEventRsvp = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({
      eventId,
      userId,
      status,
      attended,
      paid,
    }: {
      eventId: string
      userId: string
      status: EventRsvp['status']
      attended?: boolean
      paid?: boolean
    }) => adminUpdateEventRsvp(eventId, userId, status, attended, paid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rsvps', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['rsvps', 'event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}


export const useCreateMatch = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (data: CreateMatchData) => createMatch(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', variables.club_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useUpdateMatch = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (data: UpdateMatchScoreData) => updateMatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useDeleteMatch = (clubId?: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (matchId: string) => deleteMatch(matchId),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['clubs', clubId] })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useRequestJoinClub = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (clubId: string) => requestJoinClub(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useCreateEvent = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (event: Parameters<typeof createEvent>[0]) => createEvent(event),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', variables.club_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useUpdateEvent = (clubId?: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: Parameters<typeof updateEvent>[1] }) =>
      updateEvent(eventId, updates),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['clubs', clubId] })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useDeleteEvent = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (event: ClubEvent) => deleteEvent(event),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', variables.club_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useUpdateClub = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ clubId, updates }: { clubId: string; updates: Parameters<typeof updateClub>[1] }) =>
      updateClub(clubId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', variables.clubId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] })
    },
  })
}

export const useRegenerateInviteLink = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => regenerateInviteLink(clubId),
    onSuccess: (_, clubId) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] })
    },
  })
}

export const useCreateSpecificInviteLink = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => createSpecificInviteLink(clubId),
    onSuccess: (_, clubId) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] })
    },
  })
}

export const useRevokeSpecificInviteLink = (clubId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeSpecificInviteLink(inviteId),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['clubs', clubId] })
      }
    },
  })
}

export const useCreateClubAnnouncement = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ clubId, title, message }: { clubId: string; title: string; message: string }) =>
      createClubAnnouncement(clubId, title, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', variables.clubId, 'messages'] })
    },
  })
}

export const useUpdateClubMessage = (clubId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, title, message }: { messageId: string; title: string; message: string }) =>
      updateClubMessage(messageId, title, message),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'messages'] })
      }
    },
  })
}

export const useDeleteClubMessage = (clubId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => deleteClubMessage(messageId),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'messages'] })
      }
    },
  })
}
