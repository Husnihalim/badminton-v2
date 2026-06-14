import React from 'react'
import { MapPin, UserRound, Share2 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
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

  // Full Column 2 Specs Redesigned Card
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-slate-900 relative shadow-2xl text-white p-5",
        className
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 via-transparent to-blue-900/10" />

      <div className="relative space-y-4">
        {/* Top Eyebrow/Rank Header Row */}
        <div className="flex items-center justify-between z-20 relative">
          <div className="min-w-0">
            {rank ? (
              <div className="text-left leading-none">
                <span className="text-2xl font-black text-[var(--arena-lime)]">#{rank.rank}</span>
                <span className="block text-[8px] font-extrabold text-[var(--arena-text-muted)] uppercase tracking-wider mt-0.5">Singles Rank</span>
              </div>
            ) : (
              <div className="text-left leading-none">
                <span className="text-xs font-black text-[var(--arena-lime)] uppercase tracking-wider">Player Profile</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isPrivate && (
              <span className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">
                🔒 Private
              </span>
            )}
            <button 
              type="button" 
              onClick={onShare}
              className="h-6 w-6 rounded bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
            >
              <Share2 size={12} />
            </button>
          </div>
        </div>

        {/* Vertical Portrait Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-950 border border-white/10 shadow-2xl">
          {/* Dark gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none" />
          
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(204,255,0,0.15),transparent_45%)] z-10 pointer-events-none" />
          
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover relative z-0" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-800 bg-slate-900 relative z-0">
              <UserRound size={80} className="text-slate-650" />
            </div>
          )}

          {/* Primary Club Badge overlaid on top right of the photo */}
          {primaryClubName && (
            <div className="absolute top-3 right-3 z-20 flex items-center justify-center h-10 w-10 rounded-full bg-slate-950/85 backdrop-blur border border-[var(--arena-lime)]/40 shadow-lg text-[var(--arena-lime)] font-black text-[10px] uppercase tracking-tighter" title={primaryClubName}>
              {primaryClubName.split(' ').map(w => w[0]).join('').slice(0, 3)}
            </div>
          )}
        </div>

        {/* Identity Details */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none truncate">
              {displayName}
            </h2>
            {profile.name && (
              <span className="text-sm text-[var(--arena-text-muted)] font-bold">
                @{profile.name}
              </span>
            )}
          </div>
          {primaryClubName && (
            <p className="text-xs text-[var(--arena-text-dim)] font-medium">
              {primaryClubName}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--arena-text-muted)] pt-0.5">
            <span className="capitalize">{profile.preferred_sport || 'badminton'}</span>
            {profile.city && (
              <>
                <span className="text-white/25 select-none">•</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={12} className="text-[var(--arena-text-muted)]" />
                  {profile.city}
                </span>
              </>
            )}
            {g.dominant_hand && (
              <>
                <span className="text-white/25 select-none">•</span>
                <span className="capitalize">{g.dominant_hand}-handed</span>
              </>
            )}
            {g.player_type && (
              <>
                <span className="text-white/25 select-none">•</span>
                <span className="capitalize">{g.player_type.replace(/_/g, ' ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Stats Strip - 3 columns */}
        {showFullStats && (
          <div className="grid grid-cols-3 gap-2 border border-white/10 rounded-xl bg-slate-950/40 p-3">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Matches</p>
              <p className="text-lg font-black text-white mt-0.5">{stats?.matchesPlayed || 0}</p>
            </div>
            <div className="text-center border-x border-white/5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Win Rate</p>
              <p className="text-lg font-black text-[#ccff00] mt-0.5">{stats?.winRate || 0}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">ELO Rating</p>
              <p className="text-lg font-black text-white mt-0.5 flex items-center justify-center gap-0.5">
                <span className="text-[#ccff00]">⚡</span> {elo != null ? elo : 1200}
              </p>
            </div>
          </div>
        )}

        {/* Streak & Form */}
        {showFullStats && stats && stats.matchesPlayed > 0 && (
          <div 
            onClick={() => onTabChange?.('matches')}
            className="flex items-center justify-between border border-white/10 rounded-xl bg-slate-950/40 p-3 cursor-pointer hover:border-[var(--arena-lime)]/30 transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Current Streak</span>
              <span className={cn(
                "text-[10px] font-black px-1.5 py-0.5 rounded uppercase",
                stats.streakType === 'win' ? 'text-emerald-400 bg-emerald-950/40' : stats.streakType === 'loss' ? 'text-red-400 bg-red-950/40' : 'text-slate-400 bg-slate-800'
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
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' 
                      : 'bg-red-950/60 border-red-500/40 text-red-400'
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
          <div className="grid grid-cols-2 gap-3">
            {/* Top Rival */}
            <div className="border border-white/10 rounded-xl bg-slate-950/30 p-3 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Main Rival</p>
              {topRival ? (
                <div className="mt-2 flex items-center gap-2 min-w-0">
                  {topRival.userId ? (
                    <Link 
                      to={`/member/${topRival.userId}`}
                      className="flex items-center gap-2 min-w-0 hover:text-[var(--arena-lime)] transition-colors group/rival"
                    >
                      {topRival.avatarUrl ? (
                        <img src={topRival.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover border border-white/20 shrink-0" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-[var(--arena-lime)] border border-white/10 shrink-0">
                          {topRival.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate group-hover/rival:underline">{topRival.name}</p>
                        <p className="text-[8px] text-[var(--arena-text-dim)] mt-0.5">H2H: {topRival.wins}W-{topRival.matches - topRival.wins}L</p>
                      </div>
                    </Link>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-[var(--arena-lime)] border border-white/10 shrink-0">
                        {topRival.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{topRival.name}</p>
                        <p className="text-[8px] text-[var(--arena-text-dim)] mt-0.5">H2H: {topRival.wins}W-{topRival.matches - topRival.wins}L</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--arena-text-dim)] italic mt-2">No rival yet</p>
              )}
            </div>

            {/* Best Partner */}
            <div className="border border-white/10 rounded-xl bg-slate-950/30 p-3 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Best Partner</p>
              {bestPartner ? (
                <div className="mt-2 flex items-center gap-2 min-w-0">
                  {bestPartner.userId ? (
                    <Link 
                      to={`/member/${bestPartner.userId}`}
                      className="flex items-center gap-2 min-w-0 hover:text-[var(--arena-lime)] transition-colors group/partner"
                    >
                      {bestPartner.avatarUrl ? (
                        <img src={bestPartner.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover border border-white/20 shrink-0" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-[var(--arena-lime)] border border-white/10 shrink-0">
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
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-[var(--arena-lime)] border border-white/10 shrink-0">
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
                <p className="text-[10px] text-[var(--arena-text-dim)] italic mt-2">No partner yet</p>
              )}
            </div>
          </div>
        )}

        {/* Signature Moment Box */}
        {showFullStats && signatureMoment && (
          <div className="border border-white/10 rounded-xl bg-slate-950/40 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Signature Moment</p>
              <span className="text-[9px] text-[var(--arena-text-dim)]">{signatureMoment.date}</span>
            </div>
            <h4 className="text-xs font-black uppercase text-[var(--arena-lime)] mt-1.5 tracking-tight">{signatureMoment.title}</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">{signatureMoment.description}</p>
            <div className="mt-2 text-right">
              <span className="text-[10px] font-mono font-bold bg-slate-900 border border-white/10 px-2 py-0.5 rounded text-white">
                {signatureMoment.score}
              </span>
            </div>
          </div>
        )}

        {/* About Player Specs */}
        <div className="border border-white/10 rounded-xl bg-slate-950/30 p-3.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)] mb-2">About {firstName}</p>
          {profile.bio && (
            <p className="text-xs text-slate-300 leading-relaxed mb-3">{profile.bio}</p>
          )}
          <ul className="space-y-1 text-xs text-slate-350">
            {g.play_style && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--arena-lime)] select-none">•</span>
                <span>Play Style: <span className="font-bold text-white capitalize">{g.play_style.replace(/_/g, ' ')}</span></span>
              </li>
            )}
            {g.dominant_hand && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--arena-lime)] select-none">•</span>
                <span>Dominant Hand: <span className="font-bold text-white capitalize">{g.dominant_hand}-handed</span></span>
              </li>
            )}
            {g.player_type && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--arena-lime)] select-none">•</span>
                <span>Preferred Format: <span className="font-bold text-white capitalize">{g.player_type.replace(/_/g, ' ').replace('both', 'Singles & Doubles')}</span></span>
              </li>
            )}
          </ul>
        </div>

        {/* Gears & Equipment Box */}
        <div className="border border-white/10 rounded-xl bg-slate-950/40 p-3.5 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Gears & Specs</p>
          <div className="grid gap-2 grid-cols-2">
            {/* Racket Setup */}
            <div className="rounded-lg border border-white/5 bg-slate-900/30 p-2.5 space-y-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Racket Setup</p>
              {g.racket ? (
                <>
                  <p className="text-xs font-bold text-white truncate">{g.racket}</p>
                  <p className="text-[9px] text-slate-400">
                    {[
                      g.racket_weight ? `${g.racket_weight}` : null,
                      g.racket_balance ? `${g.racket_balance.replace(/_/g, ' ')}` : null,
                      g.racket_stiffness ? `${g.racket_stiffness}` : null
                    ].filter(Boolean).join(' • ') || 'No specs'}
                  </p>
                </>
              ) : (
                <p className="text-xs font-medium text-slate-500 italic">
                  {isOwner ? 'Add Racket...' : 'Not specified'}
                </p>
              )}
              {(g.strings || g.tension) ? (
                <p className="text-[9px] text-[var(--arena-lime)] font-semibold mt-1">
                  <span>Strings: <span className="font-bold text-white">{g.strings || 'Unspecified'}</span>{g.tension && ` @ ${g.tension}`}</span>
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
            <div className="rounded-lg border border-white/5 bg-slate-900/30 p-2.5 space-y-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Court Footwear</p>
              {g.shoes ? (
                <>
                  <p className="text-xs font-bold text-white truncate">{g.shoes}</p>
                  <p className="text-[9px] text-slate-400">Court Shoes</p>
                </>
              ) : (
                <p className="text-xs font-medium text-slate-500 italic">
                  {isOwner ? 'Add Shoes...' : 'Not specified'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Row Buttons */}
        <div className="flex gap-2 pt-2 z-20 relative">
          {isOwner ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex-1 rounded-xl bg-[var(--arena-lime)] text-[#040d0f] font-black uppercase text-xs py-3 tracking-wider hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={onFollowToggle}
              className={cn(
                "flex-1 rounded-xl font-black uppercase text-xs py-3 tracking-wider active:scale-[0.98] transition-all cursor-pointer text-center",
                isFollowing 
                  ? 'bg-slate-800 border border-white/10 text-white hover:bg-slate-700' 
                  : 'bg-[var(--arena-lime)] text-[#040d0f] hover:brightness-110'
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
