import React from 'react'
import { MapPin, UserRound, Share2, Zap } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { Badge } from './ui/badge'
import { cn, getEloRank } from '../lib/utils'
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
  isSimplified?: boolean
  className?: string
  // Redesign Spec Props
  primaryClubName?: string
  bestPartner?: { name: string; wins: number; matches: number; winRate: number; userId: string | null; avatarUrl: string | null } | null
  topRival?: { name: string; wins: number; matches: number; winRate: number; userId: string | null; avatarUrl: string | null } | null
  signatureMoment?: { title: string; description: string; date: string; score: string } | null
  isFollowing?: boolean
  onFollowToggle?: () => void
  onShare?: () => void
  onTabChange?: (tab: 'overview' | 'matches' | 'clubs') => void
}

export function PlayerCard({
  profile,
  stats,
  rank,
  elo,
  isOwner = false,
  isSimplified = false,
  className,
  primaryClubName,
  bestPartner,
  topRival,
  signatureMoment,
  isFollowing = false,
  onFollowToggle,
  onShare,
  onTabChange,
}: PlayerCardProps) {
  const navigate = useNavigate()
  const eloRank = elo != null ? getEloRank(elo) : null
  const displayName = profile.display_name || profile.name || 'Anonymous'
  const firstName = displayName.split(' ')[0] || displayName
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
          "rounded-xl border border-[var(--arena-border)] bg-[var(--arena-bg)] p-3 relative overflow-hidden text-[var(--arena-text)] shadow-lg",
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--arena-accent)]/5 via-transparent to-[var(--arena-blue)]/5" />
        
        <div className="relative space-y-3">
          {/* Header row: name & sport */}
          <div className="flex gap-3 items-start">
            <div className="h-12 w-12 shrink-0 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={22} className="text-[var(--arena-accent)]" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <h4 className="text-base font-extrabold truncate leading-tight">{displayName}</h4>
              <p className="text-xs text-[var(--arena-text-muted)]">
                {profile.id ? `@${profile.name}` : 'Guest Player'}
              </p>
            </div>
            {elo != null && eloRank && (
              <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                <span className="text-xs font-black text-[var(--arena-accent)] bg-[var(--arena-accent-soft)] border border-[var(--arena-accent)]/20 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                  <Zap size={12} /> {elo}
                </span>
                <span className={cn("text-[8px] font-extrabold uppercase px-1 py-0.5 rounded whitespace-nowrap", eloRank.className)}>
                  {eloRank.name}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge className="bg-success-soft hover:bg-success-soft border-none capitalize text-[var(--arena-text)] text-[9px] py-0 px-1.5 h-4">
              {profile.preferred_sport || 'badminton'}
            </Badge>
            {g.play_style && (
              <Badge className="bg-[var(--arena-surface-muted)] border-[var(--arena-border)] text-[var(--arena-text-muted)] capitalize text-[9px] py-0 px-1.5 h-4">
                {g.play_style.replace(/_/g, ' ')}
              </Badge>
            )}
            {g.dominant_hand && (
              <Badge className="bg-[var(--arena-surface-muted)] border-[var(--arena-border)] text-[var(--arena-text-muted)] capitalize text-[9px] py-0 px-1.5 h-4">
                {g.dominant_hand}-handed
              </Badge>
            )}
          </div>

          {/* Simple specs list */}
          {hasAnyGear ? (
            <div className="border-t border-[var(--arena-border)] pt-2 space-y-1 text-[11px] text-[var(--arena-text-muted)]">
              {g.racket && (
                <p className="truncate">
                  <span className="text-[var(--arena-text-dim)] font-semibold">Racket:</span> {g.racket}
                  {g.racket_weight && ` (${g.racket_weight})`}
                </p>
              )}
              {g.strings && (
                <p className="truncate">
                  <span className="text-[var(--arena-text-dim)] font-semibold">String:</span> {g.strings}
                  {g.tension && ` @ ${g.tension}`}
                </p>
              )}
              {g.shoes && (
                <p className="truncate">
                  <span className="text-[var(--arena-text-dim)] font-semibold">Shoes:</span> {g.shoes}
                </p>
              )}
            </div>
          ) : (
            <p className="border-t border-[var(--arena-border)] pt-2 text-[10px] text-[var(--arena-text-muted)] italic">No gear specs added yet.</p>
          )}

          {/* Simplified stats summary */}
          {showFullStats && stats && stats.matchesPlayed > 0 && (
            <div className="border-t border-[var(--arena-border)] pt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--arena-text-muted)]">
                Win Rate: <span className="text-[var(--arena-accent)] font-extrabold">{stats.winRate}%</span>
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

  // Full Column 2 Specs Redesigned Card
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] relative shadow-2xl text-[var(--arena-text)] p-3 sm:p-4",
        className
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--arena-accent)]/5 via-transparent to-[var(--arena-blue)]/5" />

      <div className="relative space-y-3">
        {/* Horizontal header: avatar + identity + rank/share */}
        <div className="flex gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--arena-surface-muted)]">
                  <UserRound size={36} className="text-[var(--arena-text-dim)]" />
                </div>
              )}
            </div>
            {/* Primary Club Badge */}
            {primaryClubName && (
              <div className="absolute -bottom-2 -right-2 z-20 flex items-center justify-center h-7 w-7 rounded-full bg-[var(--arena-bg)] backdrop-blur border border-[var(--arena-lime)]/40 shadow-lg text-[var(--arena-lime)] font-black text-[8px] uppercase tracking-tighter" title={primaryClubName}>
                {primaryClubName.split(' ').map(w => w[0]).join('').slice(0, 3)}
              </div>
            )}
          </div>

          {/* Identity + actions */}
          <div className="min-w-0 flex-1 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--arena-text)] leading-none truncate">
                    {displayName}
                  </h2>
                  {profile.name && (
                    <span className="text-xs sm:text-sm text-[var(--arena-text-muted)] font-bold">
                      @{profile.name}
                    </span>
                  )}
                </div>
                {primaryClubName && (
                  <p className="text-[11px] text-[var(--arena-text-dim)] font-medium mt-0.5">
                    {primaryClubName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">
                    Private
                  </span>
                )}
                <button
                  type="button"
                  onClick={onShare}
                  className="h-6 w-6 rounded-lg bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] flex items-center justify-center text-[var(--arena-text-muted)] hover:text-[var(--arena-text)] cursor-pointer"
                >
                  <Share2 size={12} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--arena-text-muted)] pt-1">
              <span className="capitalize">{profile.preferred_sport || 'badminton'}</span>
              {profile.city && (
                <>
                  <span className="text-[var(--arena-text-dim)]/40 select-none">•</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={11} className="text-[var(--arena-text-muted)]" />
                    {profile.city}
                  </span>
                </>
              )}
              {g.dominant_hand && (
                <>
                  <span className="text-[var(--arena-text-dim)]/40 select-none">•</span>
                  <span className="capitalize">{g.dominant_hand}-handed</span>
                </>
              )}
              {g.player_type && (
                <>
                  <span className="text-[var(--arena-text-dim)]/40 select-none">•</span>
                  <span className="capitalize">{g.player_type.replace(/_/g, ' ')}</span>
                </>
              )}
            </div>

            {/* Rank pill */}
            {rank && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-black text-[var(--arena-lime)] leading-none">#{rank.rank}</span>
                <span className="text-[8px] font-extrabold text-[var(--arena-text-muted)] uppercase tracking-wider">of {rank.total}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Strip - 3 columns */}
        {showFullStats && (
          <div className="grid grid-cols-3 gap-2 border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/60 p-2">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Matches</p>
              <p className="text-base sm:text-lg font-black text-[var(--arena-text)] mt-0.5">{stats?.matchesPlayed || 0}</p>
            </div>
            <div className="text-center border-x border-[var(--arena-border)]/50">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Win Rate</p>
              <p className="text-base sm:text-lg font-black text-[var(--arena-accent)] mt-0.5">{stats?.winRate || 0}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">ELO Rating</p>
              <p className="text-base sm:text-lg font-black text-[var(--arena-text)] mt-0.5 flex items-center justify-center gap-0.5">
                <Zap size={16} className="text-[var(--arena-accent)]" /> {elo != null ? elo : 1200}
              </p>
              {eloRank && (
                <span className={cn("inline-block mt-0.5 text-[8px] font-extrabold uppercase px-1 py-0.5 rounded scale-90 origin-top whitespace-nowrap", eloRank.className)}>
                  {eloRank.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Streak & Form */}
        {showFullStats && stats && stats.matchesPlayed > 0 && (
          <div
            onClick={() => onTabChange?.('matches')}
            className="flex items-center justify-between border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/60 p-2.5 cursor-pointer hover:border-[var(--arena-lime)]/30 transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Streak</span>
              <span className={cn(
                "text-[10px] font-black px-1.5 py-0.5 rounded uppercase",
                stats.streakType === 'win' ? 'text-success bg-success-soft' : stats.streakType === 'loss' ? 'text-danger bg-danger-soft' : 'text-[var(--arena-text-muted)] bg-[var(--arena-surface-muted)]'
              )}>
                {stats.streakType === 'win' ? `${stats.streak} Wins` : stats.streakType === 'loss' ? `${stats.streak} Loss` : 'No run'}
              </span>
            </div>
            <div className="flex gap-1">
              {stats.form.slice(0, 5).map((m, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded text-[9px] font-black border",
                    m.won
                      ? 'bg-success-soft border-success/40 text-success'
                      : 'bg-danger-soft border-danger/40 text-danger'
                  )}
                  title={m.setScores}
                >
                  {m.won ? 'W' : 'L'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Rival & Best Partner Grid */}
        {showFullStats && (bestPartner || topRival) && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Top Rival */}
            <div className="border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/50 p-2.5 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Main Rival</p>
              {topRival ? (
                <div className="mt-1.5 flex items-center gap-2 min-w-0">
                  {topRival.userId ? (
                    <Link
                      to={`/member/${topRival.userId}`}
                      className="flex items-center gap-2 min-w-0 hover:text-[var(--arena-lime)] transition-colors group/rival"
                    >
                      {topRival.avatarUrl ? (
                        <img src={topRival.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover border border-[var(--arena-border)] shrink-0" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[10px] font-bold text-[var(--arena-lime)] border border-[var(--arena-border)] shrink-0">
                          {topRival.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate group-hover/rival:underline">{topRival.name}</p>
                        <p className="text-[8px] text-[var(--arena-text-dim)] mt-0.5">Record: {topRival.wins}W-{topRival.matches - topRival.wins}L</p>
                      </div>
                    </Link>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[10px] font-bold text-[var(--arena-lime)] border border-[var(--arena-border)] shrink-0">
                        {topRival.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{topRival.name}</p>
                        <p className="text-[8px] text-[var(--arena-text-dim)] mt-0.5">Record: {topRival.wins}W-{topRival.matches - topRival.wins}L</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--arena-text-dim)] italic mt-1.5">No rival yet</p>
              )}
            </div>

            {/* Best Partner */}
            <div className="border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/50 p-2.5 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Best Partner</p>
              {bestPartner ? (
                <div className="mt-1.5 flex items-center gap-2 min-w-0">
                  {bestPartner.userId ? (
                    <Link
                      to={`/member/${bestPartner.userId}`}
                      className="flex items-center gap-2 min-w-0 hover:text-[var(--arena-lime)] transition-colors group/partner"
                    >
                      {bestPartner.avatarUrl ? (
                        <img src={bestPartner.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover border border-[var(--arena-border)] shrink-0" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[10px] font-bold text-[var(--arena-lime)] border border-[var(--arena-border)] shrink-0">
                        {bestPartner.name.charAt(0).toUpperCase()}
                      </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate group-hover/partner:underline">{bestPartner.name}</p>
                        <p className="text-[8px] text-[var(--arena-text-dim)] mt-0.5">{Math.round(bestPartner.winRate)}% WR ({bestPartner.matches}m)</p>
                      </div>
                    </Link>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[10px] font-bold text-[var(--arena-lime)] border border-[var(--arena-border)] shrink-0">
                        {bestPartner.name.charAt(0).toUpperCase()}
                        </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{bestPartner.name}</p>
                        <p className="text-[8px] text-[var(--arena-text-dim)] mt-0.5">{Math.round(bestPartner.winRate)}% WR ({bestPartner.matches}m)</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--arena-text-dim)] italic mt-1.5">No partner yet</p>
              )}
            </div>
          </div>
        )}

        {/* Signature Moment Box */}
        {showFullStats && signatureMoment && (
          <div className="border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Signature Moment</p>
              <span className="text-[9px] text-[var(--arena-text-dim)]">{signatureMoment.date}</span>
            </div>
            <h4 className="text-xs font-black uppercase text-[var(--arena-lime)] mt-1 tracking-tight">{signatureMoment.title}</h4>
            <p className="text-[11px] text-[var(--arena-text-muted)] mt-0.5 leading-normal">{signatureMoment.description}</p>
            <div className="mt-2 text-right">
              <span className="text-[10px] font-mono font-bold bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] px-2 py-0.5 rounded text-[var(--arena-text)]">
                {signatureMoment.score}
              </span>
            </div>
          </div>
        )}

        {/* About Player Specs */}
        <div className="border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/50 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)] mb-2">About {firstName}</p>
          {profile.bio && (
            <p className="text-xs text-[var(--arena-text-muted)] leading-relaxed mb-3">{profile.bio}</p>
          )}
          <ul className="space-y-1 text-xs text-[var(--arena-text-muted)]">
            {g.play_style && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--arena-lime)] select-none">•</span>
                <span>Play Style: <span className="font-bold text-[var(--arena-text)] capitalize">{g.play_style.replace(/_/g, ' ')}</span></span>
              </li>
            )}
            {g.dominant_hand && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--arena-lime)] select-none">•</span>
                <span>Dominant Hand: <span className="font-bold text-[var(--arena-text)] capitalize">{g.dominant_hand}-handed</span></span>
              </li>
            )}
            {g.player_type && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--arena-lime)] select-none">•</span>
                <span>Preferred Format: <span className="font-bold text-[var(--arena-text)] capitalize">{g.player_type.replace(/_/g, ' ').replace('both', 'Singles & Doubles')}</span></span>
              </li>
            )}
          </ul>
        </div>

        {/* Gears & Equipment Box */}
        <div className="border border-[var(--arena-border)] rounded-xl bg-[var(--arena-bg)]/60 p-3 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Gears & Specs</p>
          <div className="grid gap-2 grid-cols-2">
            {/* Racket Setup */}
            <div className="rounded-lg border border-[var(--arena-border)]/60 bg-[var(--arena-surface-muted)]/40 p-2.5 space-y-1">
              <p className="text-[9px] font-bold text-[var(--arena-text-dim)] uppercase tracking-tight">Racket Setup</p>
              {g.racket ? (
                <>
                  <p className="text-xs font-bold text-[var(--arena-text)] truncate">{g.racket}</p>
                  <p className="text-[9px] text-[var(--arena-text-muted)]">
                    {[
                      g.racket_weight ? `${g.racket_weight}` : null,
                      g.racket_balance ? `${g.racket_balance.replace(/_/g, ' ')}` : null,
                      g.racket_stiffness ? `${g.racket_stiffness}` : null
                    ].filter(Boolean).join(' • ') || 'No specs'}
                  </p>
                </>
              ) : (
                <p className="text-xs font-medium text-[var(--arena-text-dim)] italic">
                  {isOwner ? 'Add Racket...' : 'Not specified'}
                </p>
              )}
              {(g.strings || g.tension) ? (
                <p className="text-[9px] text-[var(--arena-lime)] font-semibold mt-1">
                  <span>Strings: <span className="font-bold text-[var(--arena-text)]">{g.strings || 'Unspecified'}</span>{g.tension && ` @ ${g.tension}`}</span>
                </p>
              ) : (
                isOwner && g.racket && (
                  <p className="text-[9px] text-[var(--arena-lime)]/50 font-semibold mt-1">
                    Add strings & tension...
                  </p>
                )
              )}
            </div>

            {/* Shoes Setup */}
            <div className="rounded-lg border border-[var(--arena-border)]/60 bg-[var(--arena-surface-muted)]/40 p-2.5 space-y-1">
              <p className="text-[9px] font-bold text-[var(--arena-text-dim)] uppercase tracking-tight">Court Footwear</p>
              {g.shoes ? (
                <>
                  <p className="text-xs font-bold text-[var(--arena-text)] truncate">{g.shoes}</p>
                  <p className="text-[9px] text-[var(--arena-text-muted)]">Court Shoes</p>
                </>
              ) : (
                <p className="text-xs font-medium text-[var(--arena-text-dim)] italic">
                  {isOwner ? 'Add Shoes...' : 'Not specified'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Row Buttons */}
        <div className="flex gap-2 pt-1 z-20 relative">
          {isOwner ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex-1 rounded-xl bg-[var(--arena-lime)] text-[var(--arena-bg)] font-black uppercase text-xs py-2.5 tracking-wider hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={onFollowToggle}
              className={cn(
                "flex-1 rounded-xl font-black uppercase text-xs py-2.5 tracking-wider active:scale-[0.98] transition-all cursor-pointer text-center",
                isFollowing
                  ? 'bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] text-[var(--arena-text)] hover:bg-[var(--arena-surface-elevated)]'
                  : 'bg-[var(--arena-lime)] text-[var(--arena-bg)] hover:brightness-110'
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
