import React from 'react'
import { MapPin, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import type { User } from '../types'

export interface PlayerCardProps {
  profile: Partial<User>
  stats?: {
    matchesPlayed: number
    wins: number
    losses: number
    winRate: number
    streak: number
    streakType: 'win' | 'loss' | null
    form: { won: boolean; setScores: string }[]
  }
  rank?: { rank: number; total: number } | null
  elo?: number | null
  isOwner?: boolean
  showH2HButton?: boolean
  isSimplified?: boolean
  className?: string
}

export function PlayerCard({
  profile,
  stats,
  rank,
  elo,
  isOwner = false,
  showH2HButton = false,
  isSimplified = false,
  className,
}: PlayerCardProps) {
  const navigate = useNavigate()
  const displayName = profile.display_name || profile.name || 'Anonymous'
  const isPrivate = profile.is_private ?? false
  const showFullStats = !isPrivate || isOwner

  // Gear & specs check
  const g = profile.gear || {}
  const hasRacket = g.racket || g.racket_weight || g.racket_balance || g.racket_stiffness
  const hasStrings = g.strings || g.tension || g.grip_type || g.grip
  const hasShoes = g.shoes
  const hasPlay = g.play_style || g.dominant_hand || g.player_type
  const hasAnyGear = hasRacket || hasStrings || hasShoes || hasPlay

  if (isSimplified) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-slate-950 p-3.5 relative overflow-hidden text-white shadow-lg",
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 via-transparent to-blue-900/5" />
        
        <div className="relative space-y-3">
          {/* Header row: name & sport */}
          <div className="flex gap-3 items-start">
            <div className="h-12 w-12 shrink-0 rounded-lg border border-white/10 bg-slate-900 overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={22} className="text-[#ccff00]" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <h4 className="text-base font-extrabold truncate leading-tight">{displayName}</h4>
              <p className="text-xs text-[var(--arena-text-muted)]">
                {profile.id ? `@${profile.name}` : 'Guest Player'}
              </p>
            </div>
            {elo != null && (
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/25 px-1.5 py-0.5 rounded">
                  ⚡ {elo}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge className="bg-emerald-950/80 hover:bg-emerald-950 border-none capitalize text-white text-[9px] py-0 px-1.5 h-4">
              {profile.preferred_sport || 'badminton'}
            </Badge>
            {g.play_style && (
              <Badge className="bg-slate-900 border-slate-800 text-[var(--arena-text-muted)] capitalize text-[9px] py-0 px-1.5 h-4">
                {g.play_style.replace(/_/g, ' ')}
              </Badge>
            )}
            {g.dominant_hand && (
              <Badge className="bg-slate-900 border-slate-800 text-[var(--arena-text-muted)] capitalize text-[9px] py-0 px-1.5 h-4">
                {g.dominant_hand}-handed
              </Badge>
            )}
          </div>

          {/* Simple specs list */}
          {hasAnyGear ? (
            <div className="border-t border-white/5 pt-2 space-y-1 text-[11px] text-[var(--arena-text-muted)]">
              {g.racket && (
                <p className="truncate">
                  <span className="text-[var(--arena-text-muted)] font-semibold">Racket:</span> {g.racket}
                  {g.racket_weight && ` (${g.racket_weight})`}
                </p>
              )}
              {g.strings && (
                <p className="truncate">
                  <span className="text-[var(--arena-text-muted)] font-semibold">String:</span> {g.strings}
                  {g.tension && ` @ ${g.tension}`}
                </p>
              )}
              {g.shoes && (
                <p className="truncate">
                  <span className="text-[var(--arena-text-muted)] font-semibold">Shoes:</span> {g.shoes}
                </p>
              )}
            </div>
          ) : (
            <p className="border-t border-white/5 pt-2 text-[10px] text-[var(--arena-text-muted)] italic">No gear specs added yet.</p>
          )}

          {/* Simplified stats summary */}
          {showFullStats && stats && stats.matchesPlayed > 0 && (
            <div className="border-t border-white/5 pt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--arena-text-muted)]">
                Win Rate: <span className="text-[#ccff00] font-extrabold">{stats.winRate}%</span>
              </span>
              <span className="text-[10px] text-[var(--arena-text-muted)] font-mono">
                {stats.wins}W - {stats.losses}L
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full arena-style profile card
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border border-white/10 bg-slate-900 relative shadow-2xl text-white",
        className
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 via-transparent to-blue-900/10" />

      <div className="relative p-5 sm:p-6">
        {/* Status chips row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#ccff00]/30 bg-[#ccff00]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ccff00]">
            🎴 Player Card
          </span>
          {isPrivate ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">
              🔒 Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
              🌐 Public Profile
            </span>
          )}
          {g.play_style && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              ✦ {g.play_style.replace(/_/g, ' ')}
            </span>
          )}
          {isOwner && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              You
            </span>
          )}
        </div>

        {/* Avatar + Identity */}
        <div className="flex flex-col items-center text-center space-y-4 sm:flex-row sm:items-start sm:text-left sm:space-y-0 sm:space-x-6">
          <div className="avatar-gradient-outline shrink-0">
            <div className="avatar-gradient-outline-inner h-24 w-24 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={48} className="text-[#ccff00]" />
              )}
            </div>
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-white truncate sm:text-5xl">{displayName}</h1>
            <p className="text-sm text-[var(--arena-text-muted)]">@{profile.name}</p>
            {profile.city && (
              <p className="text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1">
                <MapPin size={14} className="text-[var(--arena-text-muted)]" />
                {profile.city}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
              <Badge className="bg-emerald-900 hover:bg-emerald-900 border-none capitalize text-white">
                {profile.preferred_sport || 'badminton'}
              </Badge>
              {g.dominant_hand && (
                <Badge className="bg-slate-800 border-slate-700 text-slate-300 capitalize">
                  {g.dominant_hand}-handed
                </Badge>
              )}
              {g.player_type && (
                <Badge className="bg-slate-800 border-slate-700 text-slate-300 capitalize">
                  {g.player_type.replace(/_/g, ' ')}
                </Badge>
              )}
              {rank && (
                <Badge className="bg-[var(--arena-accent-soft)] border border-[var(--arena-accent)]/25 text-[var(--arena-accent)] capitalize">
                  #{rank.rank} Rank
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio ? (
          <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">
            Add a short playing bio, social handles, and gear to make this card feel complete.
          </p>
        )}

        {/* Social handles */}
        {profile.social_links && Object.values(profile.social_links).some(Boolean) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(profile.social_links)
              .filter(([, v]) => Boolean(v))
              .map(([platform, handle]) => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface/5 px-2.5 py-0.5 text-xs text-slate-300"
                >
                  {platform === 'instagram' ? '📸' : platform === 'tiktok' ? '🎵' : platform === 'youtube' ? '▶️' : platform === 'facebook' ? '👤' : '🔗'} {handle}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Stat tiles */}
      {showFullStats && stats && stats.matchesPlayed > 0 && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-5 py-4 sm:grid-cols-4 sm:px-6 bg-slate-950/30">
          <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Record</p>
            <p className="mt-1 text-lg font-extrabold text-white">
              <span className="text-emerald-400">{stats.wins}W</span>
              <span className="text-[var(--arena-text-muted)] mx-0.5">-</span>
              <span className="text-red-400">{stats.losses}L</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Win Rate</p>
            <p className="mt-1 text-lg font-extrabold text-[#ccff00]">{stats.winRate}%</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Form</p>
            <div className="mt-1.5 flex items-center justify-center gap-1">
              {stats.form.slice(0, 5).map((m, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-extrabold text-white",
                    m.won ? 'bg-[#84cc16]' : 'bg-red-500'
                  )}
                  title={m.setScores}
                >
                  {m.won ? 'W' : 'L'}
                </span>
              ))}
              {stats.form.length === 0 && <span className="text-xs text-[var(--arena-text-muted)]">—</span>}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Rank</p>
            <p className="mt-1 text-lg font-extrabold text-white">
              {rank ? `#${rank.rank}/${rank.total}` : 'Unranked'}
            </p>
          </div>
        </div>
      )}

      {/* Gear section — 3 tiles */}
      {profile.gear && Object.values(profile.gear).some(Boolean) && (() => {
        if (!hasRacket && !hasStrings && !hasShoes && !hasPlay) return null
        return (
          <div className="border-t border-white/10 px-5 py-4 sm:px-6 bg-slate-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)] mb-3">Player Bag &amp; Specs</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {/* Racket tile */}
              {hasRacket && (
                <div className="rounded-lg border border-white/5 bg-surface/[0.02] p-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Racket</p>
                  <p className="text-sm font-bold text-slate-100">{g.racket || 'Unspecified'}</p>
                  <p className="text-xs text-[var(--arena-text-muted)]">
                    {[g.racket_weight && `Weight: ${g.racket_weight}`, g.racket_balance && `Balance: ${g.racket_balance.replace(/_/g, ' ')}`, g.racket_stiffness && `Flex: ${g.racket_stiffness}`].filter(Boolean).join(' • ') || 'No specs listed'}
                  </p>
                </div>
              )}
              {/* Strings & Tension tile */}
              {hasStrings && (
                <div className="rounded-lg border border-white/5 bg-surface/[0.02] p-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Strings &amp; Tension</p>
                  <p className="text-sm font-bold text-slate-100">{g.strings || 'Unspecified'}</p>
                  <p className="text-xs">
                    {g.tension && <span className="font-bold text-[#ccff00]">Tension: {g.tension}</span>}
                    {g.tension && (g.grip_type || g.grip) && <span className="text-[var(--arena-text-muted)]"> • </span>}
                    {(g.grip_type || g.grip) && <span className="text-[var(--arena-text-muted)]">Grip: {g.grip_type ? g.grip_type.replace(/_/g, ' ') : g.grip}</span>}
                  </p>
                </div>
              )}
              {/* Shoes + Play Profile tile */}
              {(hasShoes || hasPlay) && (
                <div className="rounded-lg border border-white/5 bg-surface/[0.02] p-3 space-y-1">
                  {hasShoes && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Court Shoes</p>
                      <p className="text-sm font-bold text-slate-100">{g.shoes}</p>
                    </>
                  )}
                  {hasPlay && (
                    <p className="text-xs text-[var(--arena-text-muted)] pt-1">
                      {[g.play_style && g.play_style.replace(/_/g, ' '), g.dominant_hand && `${g.dominant_hand}-handed`, g.player_type && g.player_type.replace(/_/g, ' ')].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div className="border-t border-white/10 px-5 py-3 sm:px-6 bg-slate-950/10">
          <div className="grid gap-y-1 gap-x-4 sm:grid-cols-3 text-xs mb-3">
            <p className="text-slate-350">
              Streak: <span className={cn(
                "font-bold",
                stats?.streakType === 'win' ? 'text-amber-400' : stats?.streakType === 'loss' ? 'text-red-400' : 'text-white'
              )}>
                {stats?.streakType === 'win' ? `🔥 ${stats.streak}W` : stats?.streakType === 'loss' ? `-${stats.streak}L` : '—'}
              </span>
            </p>
            <p className="text-slate-355">Sport: <span className="font-bold text-white capitalize">{profile.preferred_sport || 'Badminton'}</span></p>
            {elo != null && (
              <p className="text-slate-355">Rating: <span className="font-extrabold text-[#ccff00]">⚡ {elo}</span></p>
            )}
          </div>

        {/* Compare H2H button */}
        {!isOwner && showFullStats && stats && stats.matchesPlayed > 0 && showH2HButton && (
          <button
            type="button"
            onClick={() => navigate(`/my-court?rival=${displayName}`)}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2 text-sm font-bold text-white transition-all shadow-lg shadow-emerald-900/30"
          >
            ⚔️ Compare Head-to-Head
          </button>
        )}
      </div>
    </div>
  )
}
