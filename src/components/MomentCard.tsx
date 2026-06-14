import { Activity, Flame, Handshake, RotateCcw, Share2, Shield, Swords, Target, Trophy } from 'lucide-react'
import type { StoryMoment, StoryMomentType } from '../lib/storyMoments'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { cn } from '../lib/utils'

type MomentCardProps = {
  moment: StoryMoment
  onShare?: (moment: StoryMoment) => void
}

const momentStyles: Record<StoryMomentType, { label: string; className: string; icon: typeof Activity }> = {
  win_streak: { label: 'Form', className: 'border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]', icon: Flame },
  response_needed: { label: 'Next hook', className: 'border-red-500/20 bg-red-500/10 text-red-400', icon: RotateCcw },
  comeback_win: { label: 'Comeback', className: 'border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]', icon: Trophy },
  clean_sweep: { label: 'Statement', className: 'border-[var(--arena-blue)]/20 bg-[var(--arena-blue)]/10 text-[var(--arena-blue)]', icon: Target },
  close_match: { label: 'Drama', className: 'border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)]', icon: Activity },
  rivalry_watch: { label: 'Rivalry', className: 'border-red-500/20 bg-red-500/10 text-red-400', icon: Swords },
  best_partner: { label: 'Partnership', className: 'border-[var(--arena-blue)]/20 bg-[var(--arena-blue)]/10 text-[var(--arena-blue)]', icon: Handshake },
  latest_result: { label: 'Latest', className: 'border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)]', icon: Shield },
  competition_invited: { label: 'Challenge', className: 'border-[var(--arena-blue)]/20 bg-[var(--arena-blue)]/10 text-[var(--arena-blue)]', icon: Target },
  competition_accepted: { label: 'Accepted', className: 'border-[var(--arena-blue)]/20 bg-[var(--arena-blue)]/10 text-[var(--arena-blue)]', icon: Handshake },
  matchmaking_complete: { label: 'Matchmaking', className: 'border-[var(--arena-blue)]/20 bg-[var(--arena-blue)]/10 text-[var(--arena-blue)]', icon: Shield },
  upset_alert: { label: 'Upset Alert', className: 'border-red-500/20 bg-red-500/10 text-red-400', icon: Flame },
  clutch_moment: { label: 'Clutch', className: 'border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]', icon: Target },
  comeback_in_progress: { label: 'Comeback', className: 'border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]', icon: RotateCcw },
  competition_completed: { label: 'Complete', className: 'border-[var(--arena-blue)]/20 bg-[var(--arena-blue)]/10 text-[var(--arena-blue)]', icon: Trophy },
  sweep_victory: { label: 'Sweep', className: 'border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]', icon: Trophy },
  narrow_escape: { label: 'Narrow Win', className: 'border-red-500/20 bg-red-500/10 text-red-400', icon: Target },
  upset_victory: { label: 'Upset Win', className: 'border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]', icon: Flame },
  rivalry_formed: { label: 'Rivalry', className: 'border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)]', icon: Swords },
}

export function MomentCard({ moment, onShare }: MomentCardProps) {
  const style = momentStyles[moment.type]
  const Icon = style.icon

  return (
    <Card className="h-full rounded-lg">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold', style.className)}>
            <Icon size={14} aria-hidden="true" />
            {style.label}
          </span>
          {moment.clubName ? <span className="truncate text-xs font-semibold text-[var(--arena-text-muted)]">{moment.clubName}</span> : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-extrabold leading-snug text-[var(--arena-text)]">{moment.title}</h3>
          <p className="text-sm leading-6 text-[var(--arena-text)]">{moment.body}</p>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--arena-border)] pt-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)] block mb-0.5">Proof</span>
            <p className="truncate text-xs font-extrabold text-[var(--arena-text)]">{moment.proofLabel}</p>
          </div>
          {onShare ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => onShare(moment)}
              className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg shrink-0"
              title="Share story"
            >
              <Share2 size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
