import { supabase } from '../supabase'
import type { HomepageMarketplaceCard, HomepageMarketplaceFeed } from '../../types'

/**
 * Phase 4 — "deal of the week near you" rail for the homepage.
 * Calls `get_homepage_marketplace` RPC; falls back to a static mock set derived
 * from the canonical seed listings in ClubMarketplace.tsx so the rail renders
 * meaningfully on an unmigrated DB.
 *
 * Privacy: never returns exact lat/lng; only `distance_km` (rounded to 1dp).
 */

export interface MarketQuery {
  lat?: number | null
  lng?: number | null
  radius_km?: number
}

const DEFAULT_RADIUS = 100 // wider default than clubs — gear travels further than sessions

const MOCK_DEALS: HomepageMarketplaceCard[] = [
  {
    id: 'yonex-astrox-88d',
    title: 'Yonex Astrox 88D Pro',
    description: '4U/G5, freshly regripped, minor paint chips near frame. Best for rear-court doubles players.',
    category: 'gear',
    condition_label: 'Good',
    price: 420,
    status: 'available',
    image_url: null,
    image_class: 'from-lime-300/35 via-sky-400/20 to-slate-900',
    trust_signals: ['23 matches recorded', 'Active member'],
    location_label: 'Subang Jaya',
    club_id: 'mock-lep-bc',
    club_name: 'LEP BC',
    club_accent: '#ccff00',
    distance_km: 6.2,
  },
  {
    id: 'victor-shoes',
    title: 'Victor A970 NitroLite shoes',
    description: 'EU 41. Used twice on indoor courts only. Selling because size is slightly tight.',
    category: 'apparel',
    condition_label: 'Like new',
    price: 180,
    status: 'reserved',
    image_url: null,
    image_class: 'from-sky-300/30 via-white/10 to-slate-950',
    trust_signals: ['Admin verified', 'Same club'],
    location_label: 'Petaling Jaya',
    club_id: 'mock-smashers-pj',
    club_name: 'Smashers PJ',
    club_accent: '#22d3ee',
    distance_km: 11.4,
  },
  {
    id: 'beginner-sparring',
    title: 'Beginner sparring session',
    description: 'One-hour guided sparring for beginners who want game feedback before club night.',
    category: 'coaching',
    condition_label: 'New',
    price: 45,
    status: 'available',
    image_url: null,
    image_class: 'from-cyan-400/25 via-lime-300/15 to-slate-950',
    trust_signals: ['Coach profile', 'Member reviewed'],
    location_label: 'Friday night',
    club_id: 'mock-lep-bc',
    club_name: 'LEP BC',
    club_accent: '#ccff00',
    distance_km: 7.8,
  },
]

function mockFeed(q: MarketQuery): HomepageMarketplaceFeed {
  const hasCoords = !!(q.lat && q.lng)
  const radius = q.radius_km ?? DEFAULT_RADIUS
  return {
    has_coords: hasCoords,
    radius_km: radius,
    deals_near: hasCoords ? MOCK_DEALS.filter((d) => d.distance_km != null && d.distance_km! <= radius) : [],
    deals_recent: MOCK_DEALS,
  }
}

export async function getHomepageMarketplace(q: MarketQuery = {}): Promise<HomepageMarketplaceFeed> {
  const radius = q.radius_km ?? DEFAULT_RADIUS
  try {
    const { data, error } = await supabase.rpc('get_homepage_marketplace', {
      p_lat: q.lat ?? null,
      p_lng: q.lng ?? null,
      p_radius_km: radius,
      p_limit: 3,
    })
    if (error || !data) return mockFeed(q)
    const feed = data as HomepageMarketplaceFeed
    // If DB exists but has no rows yet, fall back to mocks so rail isn't empty.
    if ((feed.deals_near?.length ?? 0) === 0 && (feed.deals_recent?.length ?? 0) === 0) {
      return mockFeed(q)
    }
    return feed
  } catch {
    return mockFeed(q)
  }
}

export { DEFAULT_RADIUS as DEFAULT_MARKET_RADIUS_KM }
export type { HomepageMarketplaceCard, HomepageMarketplaceFeed }