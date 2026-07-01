import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Navigation, Search, Users, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getHomepageFeed, DEFAULT_HOME_RADIUS_KM } from '../../lib/api/homepageFeed'
import type { HomepageClubCard } from '../../types'
import { setLocation } from './visitorLocation'

const RADII = [5, 25, 100]

function geoErrorToMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED: return 'Location permission denied — enter your city or postcode instead.'
    case err.POSITION_UNAVAILABLE: return 'Location unavailable right now.'
    case err.TIMEOUT: return 'Location request timed out.'
    default: return 'Could not get your location.'
  }
}

export default function FindYourScene() {
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState(DEFAULT_HOME_RADIUS_KM)
  const [textQuery, setTextQuery] = useState('')
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null)

  const hasCoords = !!(manualCoords || (lat !== null && lng !== null))
  const queryLat = manualCoords?.lat ?? lat
  const queryLng = manualCoords?.lng ?? lng

  // Publish coords so the marketplace rail (and any future homepage module)
  // shares the visitor's location without re-prompting geolocation.
  useEffect(() => {
    setLocation({ lat: queryLat, lng: queryLng, radius_km: radius })
  }, [queryLat, queryLng, radius])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['homepage-feed', queryLat, queryLng, radius],
    queryFn: () => getHomepageFeed({ lat: queryLat, lng: queryLng, radius_km: radius }),
    staleTime: 60_000,
  })

  const handleUseMyLocation = () => {
    setGeoError(null)
    setGeoBusy(true)
    if (!('geolocation' in navigator)) {
      setGeoError('Your browser does not support location. Enter your city instead.')
      setGeoBusy(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setManualCoords(null)
        setGeoBusy(false)
      },
      (err) => {
        setGeoError(geoErrorToMessage(err))
        setGeoBusy(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    )
  }

  // Lightweight free-text geocode using the OpenStreetMap Nominatim public endpoint.
  // No API key needed; honour their usage policy (one-shot on submit only).
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textQuery.trim()) return
    setGeoError(null)
    setGeoBusy(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(textQuery)}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const json = await res.json()
      const hit = Array.isArray(json) ? json[0] : null
      if (!hit || hit.lat == null || hit.lon == null) {
        setGeoError(`Couldn't find "${textQuery}". Try a city or postcode.`)
      } else {
        setManualCoords({ lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) })
      }
    } catch {
      setGeoError('Search is unavailable right now — try "Use my location".')
    } finally {
      setGeoBusy(false)
    }
  }

  const clubsNear = data?.clubs_near ?? []
  const featured = data?.featured_clubs ?? []
  const showEmpty = !isLoading && hasCoords && clubsNear.length === 0

  return (
    <section className="find-scene" id="find-your-scene" aria-label="Find clubs near you">
      <div className="find-scene-header">
        <span className="find-scene-eyebrow">📍 Find Your Scene</span>
        <h2 className="find-scene-title">Your club is already out there.</h2>
        <p className="find-scene-sub">
          Share your location and see which racket clubs, players and gear are within reach.
          {hasCoords ? ` Showing matches within ${radius} km of you.` : ' No location set — featured clubs below.'}
        </p>
      </div>

      <div className="find-scene-bar">
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--arena-accent)] text-[var(--arena-accent-text)] px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide shadow-[0_0_16px_rgba(204,255,0,0.28)] hover:shadow-[0_0_24px_rgba(204,255,0,0.45)] transition"
          disabled={geoBusy}
        >
          <Navigation size={14} />
          {geoBusy ? 'Locating…' : 'Use my location'}
        </button>

        <form className="find-scene-geo-input" onSubmit={handleSearch} role="search">
          <Search size={14} aria-hidden="true" />
          <input
            type="text"
            placeholder="Or enter your city / postcode"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            aria-label="Enter your city or postcode"
          />
          <button
            type="submit"
            className="text-xs font-bold uppercase tracking-wide text-[var(--arena-accent)] hover:underline"
            disabled={geoBusy}
          >
            Find
          </button>
        </form>

        <div className="find-scene-radius" title="Search radius">
          <MapPin size={12} aria-hidden="true" />
          <input
            type="range"
            min={RADII[0]}
            max={RADII[RADII.length - 1]}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Search radius in kilometres"
          />
          <b>{radius} km</b>
        </div>
      </div>

      {geoError && (
        <p className="text-xs text-[var(--arena-text-muted)]" role="alert">{geoError}</p>
      )}

      {isLoading && (
        <div className="find-scene-loading" aria-live="polite">
          <span className="live-ticker-dot" aria-hidden="true" />
          Scanning clubs near you…
        </div>
      )}

      {showEmpty && !isError && (
        <div className="find-scene-results-empty">
          <strong className="text-[var(--arena-text)]">
            No clubs within {radius} km of you — yet.
          </strong>
          Be the one to bring the scene to your area. Featured clubs below to inspire you.
        </div>
      )}

      {hasCoords && clubsNear.length > 0 && (
        <div className="find-scene-grid">
          {clubsNear.map((c) => (
            <ClubResultCard key={c.id} club={c} />
          ))}
        </div>
      )}

      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--arena-text-dim)]">
            <Sparkles size={12} className="text-[var(--arena-accent)]" />
            Featured clubs {hasCoords ? 'beyond your radius' : ''}
          </div>
          <div className="find-scene-grid">
            {featured.map((c) => (
              <ClubResultCard key={c.id} club={c} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function ClubResultCard({ club }: { club: HomepageClubCard }) {
  const accent = club.accent_color || undefined
  const locationChip = [club.city, club.home_postcode].filter(Boolean).join(' · ')
  return (
    <Link
      to={`/club/${club.id}`}
      className="find-scene-card"
      style={accent ? ({ '--card-accent': accent } as React.CSSProperties) : undefined}
    >
      <div className="find-scene-card-top">
        <span className="find-scene-card-name">{club.name}</span>
        {club.distance_km != null && (
          <span className="find-scene-card-dist">{club.distance_km} km</span>
        )}
      </div>

      {locationChip && (
        <span className="find-scene-card-loc">
          <MapPin size={11} />
          {locationChip}
        </span>
      )}

      <div className="find-scene-card-chips">
        {club.sport_focus?.slice(0, 2).map((s) => (
          <span key={s} className="find-scene-chip">{s}</span>
        ))}
        {club.open_join && <span className="find-scene-chip open">Open</span>}
        {club.featured_public && <span className="find-scene-chip accent">Featured</span>}
      </div>

      <div className="find-scene-card-foot">
        <span className="inline-flex items-center gap-1">
          <Users size={11} /> {club.membersCount ?? 0} members
        </span>
        <span>{club.open_join ? 'Join free' : club.approval_required ? 'Apply' : 'Invite only'}</span>
      </div>
    </Link>
  )
}