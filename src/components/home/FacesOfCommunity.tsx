import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Users } from 'lucide-react'
import { getHomepagePlayers } from '../../lib/api/homepagePlayers'
import type { HomepagePlayerCard } from '../../types'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function topElo(p: HomepagePlayerCard): number {
  return p.doubles_elo ?? p.singles_elo ?? 0
}

function eloLabel(p: HomepagePlayerCard): string {
  const elo = topElo(p)
  const games = p.doubles_games ?? p.singles_games ?? 0
  return games > 0 ? `${elo}` : `${elo}`
}

function gamesLabel(p: HomepagePlayerCard): string {
  const games = p.doubles_games ?? p.singles_games ?? 0
  return `${games}`
}

export default function FacesOfCommunity() {
  const { data, isLoading } = useQuery({
    queryKey: ['homepage-players'],
    queryFn: () => getHomepagePlayers(10),
    staleTime: 60_000,
  })

  const players = data?.players ?? []

  if (!isLoading && players.length === 0) return null

  return (
    <section className="space-y-3 pt-6" aria-label="Faces of the community">
      <div className="faces-rail-header">
        <span>
          <span className="faces-rail-eyebrow block">😎 Faces of the Community</span>
          <h2 className="faces-rail-title">The social athletes playing near you</h2>
          <p className="faces-rail-sub">
            Real players opted-in to be featured. No pros, just people who love the game.
          </p>
        </span>
      </div>

      {isLoading ? (
        <div className="find-scene-loading" aria-live="polite">
          <span className="live-ticker-dot" aria-hidden="true" />
          Loading athletes…
        </div>
      ) : (
        <div className="faces-scroller">
          {players.map((p) => (
            <FaceCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </section>
  )
}

function FaceCard({ player }: { player: HomepagePlayerCard }) {
  const accent = player.club_accent || undefined
  return (
    <Link
      to={`/member/${player.id}`}
      className="face-card"
      style={accent ? ({ '--card-accent': accent } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center gap-3">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt=""
            className="face-card-avatar"
            aria-hidden="true"
          />
        ) : (
          <div className="face-card-avatar-fallback" aria-hidden="true">
            {initialsOf(player.display_name)}
          </div>
        )}
        <span className="min-w-0">
          <span className="face-card-name block">{player.display_name}</span>
          {player.club_name && (
            <span className="face-card-club block truncate">{player.club_name}</span>
          )}
        </span>
      </div>

      {player.city && (
        <span className="face-card-loc">
          <MapPin size={11} /> {player.city}
        </span>
      )}

      {!player.is_adult && (
        <span className="face-card-minor-flag">junior · guardian-consented</span>
      )}

      <div className="face-card-stats">
        <span className="face-card-stat">
          <b>{eloLabel(player)}</b>
          <span>Elo</span>
        </span>
        <span className="face-card-stat">
          <b>{gamesLabel(player)}</b>
          <span>Games</span>
        </span>
        <span className="face-card-stat">
          <b className="inline-flex items-center gap-1">
            <Users size={11} />
          </b>
          <span>Social</span>
        </span>
      </div>
    </Link>
  )
}