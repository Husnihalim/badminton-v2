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
  win_streak: { label: 'Form', className: 'border-amber-200 bg-amber-50 text-amber-700', icon: Flame },
  response_needed: { label: 'Next hook', className: 'border-rose-200 bg-rose-50 text-rose-700', icon: RotateCcw },
  comeback_win: { label: 'Comeback', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: Trophy },
  clean_sweep: { label: 'Statement', className: 'border-blue-200 bg-blue-50 text-blue-700', icon: Target },
  close_match: { label: 'Drama', className: 'border-slate-250 bg-surface text-slate-700', icon: Activity },
  rivalry_watch: { label: 'Rivalry', className: 'border-red-200 bg-red-50 text-red-700', icon: Swords },
  best_partner: { label: 'Partnership', className: 'border-teal-200 bg-teal-50 text-teal-700', icon: Handshake },
  latest_result: { label: 'Latest', className: 'border-slate-250 bg-surface text-slate-700', icon: Shield },
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
          {moment.clubName ? <span className="truncate text-xs font-semibold text-slate-400">{moment.clubName}</span> : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-extrabold leading-snug text-slate-950">{moment.title}</h3>
          <p className="text-sm leading-6 text-slate-600">{moment.body}</p>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{moment.proofLabel}</p>
          {onShare ? (
            <Button type="button" size="sm" variant="secondary" fullWidth onClick={() => onShare(moment)}>
              <Share2 size={14} aria-hidden="true" />
              Copy story
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
