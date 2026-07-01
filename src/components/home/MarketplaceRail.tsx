import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ShoppingBag } from 'lucide-react'
import { getHomepageMarketplace } from '../../lib/api/homepageMarketplace'
import { useVisitorLocation } from './useVisitorLocation'
import type { HomepageMarketplaceCard } from '../../types'

const CATEGORY_EMOJI: Record<string, string> = {
  gear: '🏸',
  apparel: '👟',
  court: '🏟️',
  coaching: '🎯',
  wanted: '🚨',
}

function formatPrice(price: number | null): string {
  return price === null ? 'Offer' : `RM ${price}`
}

export default function MarketplaceRail() {
  const loc = useVisitorLocation()

  const { data, isLoading } = useQuery({
    queryKey: ['homepage-marketplace', loc.lat, loc.lng, loc.radius_km],
    queryFn: () =>
      getHomepageMarketplace({
        lat: loc.lat,
        lng: loc.lng,
        radius_km: loc.radius_km,
      }),
    staleTime: 60_000,
  })

  const deals = (() => {
    if (!data) return []
    // Prefer location-scoped deals; fall back to recent location-independent.
    const near = data.deals_near ?? []
    const recent = data.deals_recent ?? []
    const pool = near.length > 0 ? near : recent
    return pool.slice(0, 3)
  })()

  const subtitle = data?.has_coords && (data.deals_near?.length ?? 0) > 0
    ? `Top deals within ${data.radius_km} km of you.`
    : 'Recent deals from clubs across the network — share your location to see what is near you.'

  return (
    <section className="market-rail" aria-label="Marketplace deals near you">
      <div className="market-rail-head">
        <span>
          <span className="market-rail-eyebrow block">🛒 Deal of the week near you</span>
          <h3 className="market-rail-title">Gear, courts & coaching within reach</h3>
          <p className="market-rail-sub">{subtitle}</p>
        </span>
        <Link
          to="/marketplace"
          className="text-xs font-bold uppercase tracking-wide text-[var(--arena-accent)] hover:underline hidden sm:inline-flex items-center gap-1"
        >
          <ShoppingBag size={12} />
          Browse all
        </Link>
      </div>

      {isLoading ? (
        <div className="find-scene-loading" aria-live="polite">
          <span className="live-ticker-dot" aria-hidden="true" />
          Scanning deals near you…
        </div>
      ) : deals.length === 0 ? (
        <div className="find-scene-results-empty">
          <strong className="text-[var(--arena-text)]">No listings yet.</strong>
          Clubs will post gear, court slots and coaching here — share your location to see the first ones near you.
        </div>
      ) : (
        <div className="market-rail-grid">
          {deals.map((d) => (
            <MarketCard key={d.id} listing={d} />
          ))}
        </div>
      )}
    </section>
  )
}

function MarketCard({ listing }: { listing: HomepageMarketplaceCard }) {
  const target = listing.club_id ? `/club/${listing.club_id}` : '/marketplace'
  return (
    <Link to={target} className="market-card">
      <div className="market-card-artwork">
        {listing.image_url ? (
          <img src={listing.image_url} alt="" aria-hidden="true" />
        ) : (
          <span className="mk-player">{CATEGORY_EMOJI[listing.category] ?? '📦'}</span>
        )}
        {listing.status !== 'available' && (
          <span className={`market-card-status ${listing.status}`}>{listing.status}</span>
        )}
      </div>

      <span className="market-card-title">{listing.title}</span>

      <span className="market-card-meta">
        {listing.category} · {listing.condition_label}
        {listing.club_name ? ` · ${listing.club_name}` : ''}
      </span>

      {listing.location_label && (
        <span className="market-card-meta">
          <MapPin size={11} /> {listing.location_label}
          {listing.distance_km != null && (
            <span className="market-card-dist"> · {listing.distance_km} km</span>
          )}
        </span>
      )}

      <div className="market-card-foot">
        <span className="market-card-price">{formatPrice(listing.price)}</span>
        {listing.trust_signals?.[0] && (
          <span className="text-[10px] font-semibold text-[var(--arena-text-dim)] uppercase tracking-wide">
            {listing.trust_signals[0]}
          </span>
        )}
      </div>
    </Link>
  )
}