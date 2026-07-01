import { supabase } from '../supabase'
import type { Club, HomepageClubCard, HomepageFeed } from '../../types'
import { mockClubs } from '../mockShowcase'

/**
 * Phase 2 of the ESPN-style homepage. Calls the `get_homepage_clubs` RPC when
 * coordinates are available, falls back to mock clubs (with synthetic distance
 * guesses from mockUser city strings) when the RPC is missing or when the
 * visitor hasn't shared their location.
 */

export interface FindSceneQuery {
  lat?: number | null
  lng?: number | null
  radius_km?: number
}

const defaultRadius = 25

// Haversine, km. Pure client-side, used only for mock fallback or RPC failure.
export function haversineKm(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Mock fallback — derive a stable fake distance from the city string so
// returning visitors see consistent numbers when the DB hasn't been migrated.
function mockFeed(q: FindSceneQuery): HomepageFeed {
  const cards: HomepageClubCard[] = Object.values(mockClubs).map((c: Club) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    home_postcode: null,
    sport_focus: c.sport_focus,
    accent_color: c.accent_color ?? null,
    logo_url: c.logo_url ?? null,
    banner_preset: c.banner_preset ?? null,
    open_join: c.open_join,
    approval_required: c.approval_required,
    is_private: c.is_private ?? false,
    featured_public: true,
    membersCount: 0,
    distance_km: deriveMockDistanceKm(c, q),
  }))

  const hasCoords = !!(q.lat && q.lng)
  const radiusKm = q.radius_km ?? defaultRadius
  const clubsNear = hasCoords
    ? cards.filter((c) => c.distance_km !== null && c.distance_km! <= radiusKm).slice(0, 6)
    : []

  return {
    has_coords: hasCoords,
    radius_km: radiusKm,
    clubs_near: clubsNear,
    featured_clubs: cards.slice(0, 4),
  }
}

function deriveMockDistanceKm(c: Club, q: FindSceneQuery): number | null {
  if (!q.lat || !q.lng) return null
  if (!c.city) return null
  // Stable pseudo-distance based on city string hash so the same visitor
  // always sees the same card with the same number. In reality each club's
  // coordinates will come from `clubs.home_lat / home_lng` once migrated.
  let h = 0
  for (let i = 0; i < c.city.length; i++) h = (h * 31 + c.city.charCodeAt(i)) >>> 0
  return +(h % 18 + 1).toFixed(1) // 1.0–18.0 km — always inside default radius
}

export async function getHomepageFeed(q: FindSceneQuery = {}): Promise<HomepageFeed> {
  const radiusKm = q.radius_km ?? defaultRadius

  // No coords → ask the RPC for the featured set only (it tolerates NULL lat/lng).
  // We still try the RPC; if it fails or is absent on this DB, fall back to mock.
  try {
    const { data, error } = await supabase.rpc('get_homepage_clubs', {
      p_lat: q.lat ?? null,
      p_lng: q.lng ?? null,
      p_radius_km: radiusKm,
      p_limit_near: 12,
      p_limit_featured: 8,
    })

    if (error || !data) {
      return mockFeed(q)
    }
    return data as HomepageFeed
  } catch {
    return mockFeed(q)
  }
}

export async function setClubHomeLocation(
  clubId: string,
  home: { lat: number; lng: number; postcode?: string | null; city?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .update({
      home_lat: home.lat,
      home_lng: home.lng,
      home_postcode: home.postcode ?? null,
      city: home.city ?? null,
    } as never)
    .eq('id', clubId)

  if (error) throw error
}

export async function setClubFeaturedPublic(clubId: string, featured: boolean): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .update({ featured_public: featured } as never)
    .eq('id', clubId)

  if (error) throw error
}

export type { HomepageClubCard, HomepageFeed }
export { defaultRadius as DEFAULT_HOME_RADIUS_KM }