import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Activity, MapPin, Radio, Share2, Trophy, UserRound, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import type { PlayerGear } from '../types'

type LiveStatusChipProps = {
  label: string
  tone?: 'live' | 'blue' | 'heat' | 'muted'
}

export function LiveStatusChip({ label, tone = 'live' }: LiveStatusChipProps) {
  return (
    <Badge variant={tone === 'muted' ? 'muted' : tone} className="gap-1.5 uppercase tracking-wide">
      <Radio size={12} aria-hidden="true" />
      {label}
    </Badge>
  )
}

type ScoreboardTileProps = {
  label: string
  value: string
  helper?: string
  tone?: 'lime' | 'blue' | 'heat' | 'neutral'
}

export function ScoreboardTile({ label, value, helper, tone = 'neutral' }: ScoreboardTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-[rgba(4,13,15,0.86)] p-3 text-[var(--arena-text)]',
        tone === 'lime' && 'border-[var(--arena-line)]',
        tone === 'blue' && 'border-[var(--arena-line-blue)]',
        tone === 'heat' && 'border-amber-400/35',
        tone === 'neutral' && 'border-white/10'
      )}
    >
      <p className="arena-label">{label}</p>
      <p className="arena-score-number mt-2 text-3xl">{value}</p>
      {helper ? <p className="arena-meta mt-1">{helper}</p> : null}
    </div>
  )
}

type PlayerStatTileProps = {
  label: string
  value: string
  note?: string
}

export function PlayerStatTile({ label, value, note }: PlayerStatTileProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <p className="arena-label">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-[var(--arena-text)]">{value}</p>
      {note ? <p className="arena-meta mt-1">{note}</p> : null}
    </div>
  )
}

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  action?: ReactNode
}

export function SectionHeader({ eyebrow, title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="arena-label text-[var(--arena-lime)]">{eyebrow}</p> : null}
        <h2 className="arena-heading truncate text-xl">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

type MetadataLabelProps = {
  icon?: ReactNode
  children: ReactNode
}

export function MetadataLabel({ icon, children }: MetadataLabelProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
      {icon}
      {children}
    </span>
  )
}

type StoryCardProps = {
  category: string
  title: string
  body: string
  proof: string
  tone?: 'lime' | 'blue' | 'heat'
  actionLabel?: string
}

export function StoryCard({ category, title, body, proof, tone = 'lime', actionLabel }: StoryCardProps) {
  return (
    <Card variant={tone === 'blue' ? 'arena' : 'live'} className={cn(tone === 'blue' && 'arena-panel-blue')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <Badge variant={tone === 'heat' ? 'heat' : tone === 'blue' ? 'blue' : 'live'}>{category}</Badge>
          <span className="text-right text-xs font-semibold text-slate-400">{proof}</span>
        </div>
        <h3 className="arena-heading text-2xl">{title}</h3>
        <p className="text-sm leading-6 text-slate-300">{body}</p>
        {actionLabel ? (
          <Button type="button" size="sm" variant="panel">
            <Share2 size={14} aria-hidden="true" />
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

type ClubHeadlineCardProps = {
  club: string
  headline: string
  meta: string
  stats: Array<{ label: string; value: string }>
}

export function ClubHeadlineCard({ club, headline, meta, stats }: ClubHeadlineCardProps) {
  return (
    <Card variant="live">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="arena-label text-[var(--arena-lime)]">{club}</p>
            <h3 className="arena-heading mt-2 text-3xl">{headline}</h3>
            <p className="arena-meta mt-2">{meta}</p>
          </div>
          <LiveStatusChip label="Live" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <ScoreboardTile key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

type ShareCardPreviewProps = {
  title: string
  subtitle: string
  score: string
}

export function ShareCardPreview({ title, subtitle, score }: ShareCardPreviewProps) {
  return (
    <div className="arena-panel arena-court-lines aspect-square max-w-sm p-4">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <Badge variant="live">Share card</Badge>
          <Trophy size={18} className="text-[var(--arena-lime)]" aria-hidden="true" />
        </div>
        <div>
          <p className="arena-label text-[var(--arena-lime)]">Match result</p>
          <h3 className="arena-heading mt-2 text-3xl">{title}</h3>
          <p className="arena-meta mt-2">{subtitle}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="arena-score-number text-5xl">{score}</p>
          <div className="text-right">
            <Activity size={18} className="ml-auto text-[var(--arena-blue)]" aria-hidden="true" />
            <p className="mt-1 text-sm font-black text-[var(--arena-text)]">KelabSukan</p>
          </div>
        </div>
      </div>
    </div>
  )
}

type PlayerIdentityCardProps = {
  name: string
  sport: string
  clubName?: string
  city?: string
  avatarUrl?: string | null
  isPrivate?: boolean
  bio?: string | null
  socialHandles?: string[]
  metrics: Array<{ label: string; value: string }>
  details: Array<{ label: string; value: string }>
  gear?: PlayerGear | null
  rankings?: Array<{ clubId: string; clubName: string; rank: number; total: number }> | null
  toughestOpponent?: { name: string; userId?: string | null; avatarUrl?: string | null; wins?: number; losses?: number; matches?: number; winRate?: number } | null
  mostDefeatedOpponent?: { name: string; userId?: string | null; avatarUrl?: string | null; wins?: number; losses?: number; matches?: number; winRate?: number } | null
}

const PLAYSTYLE_LABELS: Record<string, string> = {
  net_play: 'Net Player (Front Court)',
  aggressive: 'Aggressive / Smasher',
  dropshot_control: 'Dropshot / Control',
  defensive: 'Defensive',
  all_round: 'All-Round',
}

const BALANCE_LABELS: Record<string, string> = {
  head_heavy: 'Head Heavy',
  even_balance: 'Even Balance',
  head_light: 'Head Light',
}

const GRIP_LABELS: Record<string, string> = {
  towel: 'Towel Grip',
  overgrip: 'Overgrip',
  replacement: 'Replacement',
}

export function PlayerIdentityCard({
  name,
  sport,
  clubName,
  city,
  avatarUrl,
  isPrivate = false,
  bio,
  socialHandles = [],
  metrics,
  details,
  gear,
  rankings = [],
  toughestOpponent,
  mostDefeatedOpponent,
}: PlayerIdentityCardProps) {
  const playStyleLabel = gear?.play_style ? PLAYSTYLE_LABELS[gear.play_style] || gear.play_style : null
  const dominantHandLabel = gear?.dominant_hand ? `${gear.dominant_hand === 'right' ? 'Right' : 'Left'}-Handed` : null
  const playerTypePreferenceLabel = gear?.player_type ? (gear.player_type === 'both' ? 'Singles & Doubles' : gear.player_type.charAt(0).toUpperCase() + gear.player_type.slice(1)) : null

  const renderOpponentLink = (opp: PlayerIdentityCardProps['toughestOpponent']) => {
    if (!opp) return <span className="text-slate-400 text-xs">None recorded</span>

    const matchStatsText = opp.matches && opp.matches > 0 
      ? ` (${opp.wins}W-${opp.losses}L)` 
      : ''

    if (opp.userId) {
      return (
        <Link
          to={`/member/${opp.userId}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-[var(--arena-lime)] transition-colors group"
        >
          {opp.avatarUrl ? (
            <img src={opp.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover border border-white/20" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-[var(--arena-lime)] border border-white/10">
              {opp.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-bold underline decoration-white/20 group-hover:decoration-[var(--arena-lime)]">{opp.name}</span>
          <span className="text-slate-400 font-normal">{matchStatsText}</span>
        </Link>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
        <span className="font-bold">{opp.name}</span>
        <span className="text-slate-400">{matchStatsText}</span>
      </span>
    )
  }

  return (
    <Card variant="live" className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative min-h-48 md:min-h-72 bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(204,255,0,0.22),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_34%),linear-gradient(160deg,#08110f,#020706_62%,#102310)]" />
            <div className="absolute inset-x-5 bottom-5 top-8 overflow-hidden rounded-lg border border-white/10 bg-slate-950/45 shadow-2xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--arena-lime)]">
                  <UserRound size={90} aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="live">Player card</Badge>
                <Badge variant={isPrivate ? 'muted' : 'blue'}>{isPrivate ? 'Private profile' : 'Public profile'}</Badge>
                {playStyleLabel && (
                  <Badge variant="heat" className="gap-1">
                    <Sparkles size={11} aria-hidden="true" />
                    {playStyleLabel}
                  </Badge>
                )}
              </div>
              <div>
                <h2 className="arena-heading truncate text-4xl sm:text-5xl">{name}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <MetadataLabel>{sport}</MetadataLabel>
                  {clubName ? <MetadataLabel>{clubName}</MetadataLabel> : null}
                  {city ? (
                    <MetadataLabel icon={<MapPin size={14} aria-hidden="true" />}>
                      {city}
                    </MetadataLabel>
                  ) : null}
                  {dominantHandLabel && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      • {dominantHandLabel}
                    </span>
                  )}
                  {playerTypePreferenceLabel && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      • {playerTypePreferenceLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-slate-350">
              {bio || 'Add a short playing bio, social handles, and gear to make this card feel complete.'}
            </p>

            {socialHandles.length ? (
              <div className="flex flex-wrap gap-2">
                {socialHandles.slice(0, 4).map((handle) => (
                  <span key={handle} className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs font-semibold text-slate-350">
                    {handle}
                  </span>
                ))}
              </div>
            ) : null}

            {rankings && rankings.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Club Rankings:</span>
                {rankings.map((r) => (
                  <Link key={r.clubId} to={`/club/${r.clubId}`} className="inline-flex items-center gap-1 rounded bg-slate-900 border border-white/10 px-2 py-0.5 font-bold text-[var(--arena-lime)] hover:bg-slate-800 transition-colors">
                    {r.clubName}: #{r.rank} / {r.total}
                  </Link>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              {metrics.map((metric) => (
                <PlayerStatTile key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Gear Bags section */}
        {gear && (gear.racket || gear.shoes || gear.strings || gear.tension || gear.grip_type || gear.grip) && (
          <div className="border-t border-white/10 p-5 sm:p-6 bg-slate-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Player Bag & Specs</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(gear.racket || gear.strings || gear.tension || gear.racket_weight || gear.racket_balance || gear.racket_stiffness) && (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Racket Setup</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{gear.racket || 'Unspecified Racket'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {[
                      gear.racket_weight ? `Weight: ${gear.racket_weight}` : null,
                      gear.racket_balance ? `Balance: ${BALANCE_LABELS[gear.racket_balance] || gear.racket_balance}` : null,
                      gear.racket_stiffness ? `Stiffness: ${gear.racket_stiffness.charAt(0).toUpperCase() + gear.racket_stiffness.slice(1)}` : null,
                    ].filter(Boolean).join(' • ') || 'No racket specs details'}
                  </p>
                  {(gear.strings || gear.tension || gear.grip_type || gear.grip) && (
                    <p className="text-[11px] text-[var(--arena-lime)] mt-2 font-semibold">
                      {[
                        gear.strings ? `Strings: ${gear.strings}` : null,
                        gear.tension ? `Tension: ${gear.tension}` : null,
                        gear.grip_type ? `Grip: ${GRIP_LABELS[gear.grip_type] || gear.grip_type}` : (gear.grip ? `Grip: ${gear.grip}` : null)
                      ].filter(Boolean).join(' | ')}
                    </p>
                  )}
                </div>
              )}
              {gear.shoes && (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Court Shoes</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{gear.shoes}</p>
                  <p className="text-xs text-slate-400 mt-1">Court Footwear</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-4 sm:p-6 bg-slate-900/10">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0">
              <p className="arena-label">{detail.label}</p>
              <p className="mt-1 truncate text-sm font-bold text-[var(--arena-text)]">{detail.value}</p>
            </div>
          ))}

          {/* Opponent Insights links */}
          {(toughestOpponent || mostDefeatedOpponent) && (
            <div className="col-span-full grid gap-3 sm:grid-cols-2 pt-3 border-t border-white/5 mt-1">
              <div className="space-y-1">
                <p className="arena-label">Nemesis (Toughest Opponent)</p>
                <div className="mt-1">{renderOpponentLink(toughestOpponent)}</div>
              </div>
              <div className="space-y-1">
                <p className="arena-label">Most Defeated Opponent</p>
                <div className="mt-1">{renderOpponentLink(mostDefeatedOpponent)}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
