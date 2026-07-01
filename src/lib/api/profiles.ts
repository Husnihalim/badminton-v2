import { supabase } from '../supabase'
import type { MatchWithDetails, PlayerGear, PlayerSocialLinks, PlayerDashboardData } from '../../types'
import { mockClubs, mockEvents, mockLeaderboards, mockMatches, mockMemberships, mockUsers } from '../mockShowcase'
import { getPrimaryElo } from '../playerCardData'

export async function ensureCurrentUserProfile(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be authenticated')
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('Error checking profile:', selectError)
    throw selectError
  }

  if (existingProfile) return

  const email = user.email || ''
  const name = user.user_metadata?.name || email.split('@')[0] || 'Member'

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email,
      name,
      role: 'member',
    } as never)

  if (insertError) {
    console.error('Error creating missing profile:', insertError)
    throw insertError
  }
}

export async function getProfile(userId: string) {
  if (userId && userId.startsWith('mock-')) {
    return mockUsers[userId] || null
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, display_name, phone, city, bio, preferred_sport, avatar_url, is_private, social_links, gear, singles_elo, doubles_elo, singles_games, doubles_games')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export type ProfileUpdates = {
  display_name?: string | null
  phone?: string | null
  city?: string | null
  bio?: string | null
  preferred_sport?: string | null
  avatar_url?: string | null
  is_private?: boolean | null
  social_links?: PlayerSocialLinks | null
  gear?: PlayerGear | null
}

export async function updateProfile(userId: string, updates: ProfileUpdates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  return data
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Error uploading profile photo:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(filePath)

  await updateProfile(userId, { avatar_url: data.publicUrl })
  return data.publicUrl
}

function getMockPlayerDashboard(userId: string): PlayerDashboardData {
  const profile = mockUsers[userId]
  const allMockMatches = Object.values(mockMatches).flat() as MatchWithDetails[]
  const playerMatches = allMockMatches
    .filter((match) => match.participants.some((participant) => participant.user_id === userId)) as MatchWithDetails[]
  const sortedMatches = [...playerMatches].sort(
    (a, b) =>
      new Date(b.match_date || b.created_at).getTime() -
      new Date(a.match_date || a.created_at).getTime()
  )

  let matchesPlayed = 0
  let wins = 0
  let losses = 0
  let streak = 0
  let streakType: 'win' | 'loss' | null = null
  let streakBroken = false

  for (const match of sortedMatches) {
    const userPart = match.participants.find((participant) => participant.user_id === userId)
    if (!userPart) continue

    const team1Sets = match.score_sets.filter((set) => set.team1_score > set.team2_score).length
    const team2Sets = match.score_sets.filter((set) => set.team2_score > set.team1_score).length
    if (team1Sets === team2Sets) continue

    matchesPlayed += 1
    const isWin =
      (team1Sets > team2Sets && userPart.team === 1) ||
      (team2Sets > team1Sets && userPart.team === 2)

    if (isWin) wins += 1
    else losses += 1

    if (!streakBroken) {
      const outcome = isWin ? 'win' : 'loss'
      if (!streakType) {
        streakType = outcome
        streak = 1
      } else if (streakType === outcome) {
        streak += 1
      } else {
        streakBroken = true
      }
    }
  }

  const memberships = Object.values(mockMemberships)
    .flat()
    .filter((membership) => membership.user_id === userId)

  const clubs = memberships
    .map((membership) => {
      const club = mockClubs[membership.club_id]
      if (!club) return null

      const leaderboard = mockLeaderboards[club.id] || []
      const rankIndex = leaderboard.findIndex((row) => row.name === (profile?.display_name || profile?.name))
      const memberProfiles = (mockMemberships[club.id] || [])
        .map((member) => mockUsers[member.user_id])
        .filter(Boolean)
      const avgElo = memberProfiles.length
        ? Math.round(memberProfiles.reduce((total, memberProfile) => total + getPrimaryElo(memberProfile), 0) / memberProfiles.length)
        : 1200

      return {
        ...club,
        role: membership.role,
        singles_elo: profile?.singles_elo ?? 1200,
        doubles_elo: profile?.doubles_elo ?? 1200,
        singles_games: profile?.singles_games ?? 0,
        doubles_games: profile?.doubles_games ?? 0,
        rank: rankIndex >= 0 ? { rank: rankIndex + 1, total: leaderboard.length } : null,
        members_count: memberProfiles.length,
        avg_elo: avgElo,
      }
    })
    .filter((club): club is NonNullable<typeof club> => Boolean(club))

  const upcomingEvents = clubs.flatMap((club) =>
    (mockEvents[club.id] || []).map((event) => ({
      ...event,
      club_name: club.name,
      rsvp_status: null,
      attendees_count: 0,
    }))
  )

  const cleanSweep = sortedMatches.some((match) => {
    const userPart = match.participants.find((participant) => participant.user_id === userId)
    if (!userPart) return false
    return match.score_sets.some((set) =>
      userPart.team === 1
        ? set.team1_score - set.team2_score >= 10
        : set.team2_score - set.team1_score >= 10
    )
  })

  const matchesByDay = new Map<string, number>()
  sortedMatches.forEach((match) => {
    const day = (match.match_date || match.created_at).slice(0, 10)
    matchesByDay.set(day, (matchesByDay.get(day) || 0) + 1)
  })

  return {
    clubs,
    upcoming_events: upcomingEvents,
    recent_matches: sortedMatches.slice(0, 10),
    stats: {
      matchesPlayed,
      wins,
      losses,
      winRate: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
      streak,
      streakType,
    },
    achievements: {
      onFire: streakType === 'win' && streak >= 3,
      cleanSweep,
      ironMan: Array.from(matchesByDay.values()).some((count) => count >= 3),
      dynamicDuo: false,
      giantSlayer: false,
    },
  }
}

export async function getPlayerDashboard(userId: string): Promise<PlayerDashboardData> {
  if (userId && userId.startsWith('mock-')) {
    return getMockPlayerDashboard(userId)
  }

  const { data, error } = await supabase.rpc('get_player_dashboard', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error fetching player dashboard:', error)
    throw error
  }

  return data as PlayerDashboardData
}
