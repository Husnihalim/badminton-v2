import { supabase } from '../supabase'
import type { HomepagePlayerCard, HomepagePlayersFeed, User } from '../../types'
import { mockMemberships, mockClubs } from '../mockShowcase'

/**
 * Phase 3 — featured players for the homepage "Faces of the Community" rail.
 * Calls `get_homepage_players` RPC; falls back to mock athletes when the RPC is
 * absent or returns nothing (so the wall is never empty on an unmigrated DB).
 *
 * Privacy contract: never returns DOB, email, phone, or exact address. Minors
 * only surface when both `guardian_feature_consent` is true AND they belong to a
 * `featured_public` club — the RPC enforces this server-side.
 */
export async function getHomepagePlayers(limit = 12): Promise<HomepagePlayersFeed> {
  try {
    const { data, error } = await supabase.rpc('get_homepage_players', {
      p_limit: limit,
    })

    if (error || !data) {
      return mockPlayersFeed(limit)
    }

    const feed = data as HomepagePlayersFeed
    if (!feed.players || feed.players.length === 0) {
      return mockPlayersFeed(limit)
    }
    return feed
  } catch {
    return mockPlayersFeed(limit)
  }
}

function mockPlayersFeed(limit: number): HomepagePlayersFeed {
  const cards: HomepagePlayerCard[] = []
  for (const m of Object.values(mockMemberships).flat()) {
    const user: User | undefined = m.profile
    if (!user) continue
    const club = mockClubs[m.club_id]
    cards.push({
      id: user.id,
      display_name: user.display_name || user.name,
      avatar_url: user.avatar_url ?? null,
      city: user.city ?? null,
      preferred_sport: user.preferred_sport ?? null,
      singles_elo: user.singles_elo ?? null,
      doubles_elo: user.doubles_elo ?? null,
      singles_games: user.singles_games ?? null,
      doubles_games: user.doubles_games ?? null,
      club_id: club?.id ?? m.club_id,
      club_name: club?.name ?? null,
      club_accent: club?.accent_color ?? null,
      is_adult: true, // mocks are all adults; minors never auto-featured
    })
  }
  // Highest Elo first — mirrors the RPC ordering
  cards.sort((a, b) => (b.doubles_elo ?? b.singles_elo ?? 0) - (a.doubles_elo ?? a.singles_elo ?? 0))
  return { players: cards.slice(0, limit) }
}

export async function setProfileFeaturedPublic(
  userId: string,
  featured: boolean,
  guardianConsent?: boolean,
  guardianName?: string | null,
): Promise<void> {
  const updates: Record<string, unknown> = { featured_public: featured }
  if (guardianConsent !== undefined) updates.guardian_feature_consent = guardianConsent
  if (guardianName !== undefined) updates.guardian_name = guardianName || null

  const { error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', userId)

  if (error) throw error
}

export type { HomepagePlayerCard, HomepagePlayersFeed }