import { Link } from 'react-router-dom'
import { Trophy, HeartCrack } from 'lucide-react'
import type { StoryMoment } from '../../lib/storyMoments'
import { formatTimeAgo } from './formatMatch'

interface Props {
  stories: StoryMoment[]
}

// Win-tierTypes → celebratory column. Loss-tier → heartbreak column.
const WIN_TYPES = new Set<StoryMoment['type']>([
  'comeback_win',
  'clean_sweep',
  'win_streak',
  'best_partner',
  'sweep_victory',
  'upset_victory',
  'clutch_moment',
  'narrow_escape',
])

const LOSS_TYPES = new Set<StoryMoment['type']>([
  'rivalry_watch',
  'close_match',
  'upset_alert',
  'rivalry_formed',
  'comeback_in_progress',
])

function classify(stories: StoryMoment[]) {
  const wins: StoryMoment[] = []
  const losses: StoryMoment[] = []
  for (const s of stories) {
    if (WIN_TYPES.has(s.type)) wins.push(s)
    else if (LOSS_TYPES.has(s.type)) losses.push(s)
    else {
      // default: positive stories (latest_result etc.) lean to wins column
      wins.push(s)
    }
  }
  return { wins, losses }
}

const FRIENDLY_TAG: Record<string, string> = {
  comeback_win: 'Comeback',
  clean_sweep: 'Statement',
  win_streak: 'Streak',
  best_partner: 'Bromance',
  close_match: 'Nail-biter',
  rivalry_watch: 'Rivalry',
  rivalry_formed: 'New rivalry',
  upset_alert: 'Upset alert',
  clutch_moment: 'Clutch',
  narrow_escape: 'Great escape',
  sweep_victory: 'Sweep',
  upset_victory: 'Upset',
}

function tagFor(s: StoryMoment): string {
  return FRIENDLY_TAG[s.type] ?? s.type.replace('_', ' ')
}

export default function WinsAndHeartbreaks({ stories }: Props) {
  const { wins, losses } = classify(stories)
  if (wins.length === 0 && losses.length === 0) return null

  return (
    <section className="wins-heartbreaks pt-6" aria-label="Wins and heartbreaks">
      <Column
        variant="wins"
        title="Wins"
        sub="Comebacks, streaks, statements."
        stories={wins}
      />
      <Column
        variant="losses"
        title="Heartbreaks"
        sub="Upsets, fallen streaks, rivalries."
        stories={losses}
      />
    </section>
  )
}

function Column({
  variant,
  title,
  sub,
  stories,
}: {
  variant: 'wins' | 'losses'
  title: string
  sub: string
  stories: StoryMoment[]
}) {
  const Icon = variant === 'wins' ? Trophy : HeartCrack
  return (
    <div className="wh-col">
      <h3 className={`wh-col-head ${variant}`}>
        <Icon size={18} />
        {title}
      </h3>
      <div className="wh-col-sub">{sub}</div>

      {stories.length === 0 ? (
        <div className="wh-empty">No {title.toLowerCase()} this week.</div>
      ) : (
        stories.slice(0, 4).map((s) => {
          const target = s.clubId ? `/club/${s.clubId}` : '/'
          return (
            <Link key={s.id} to={target} className="wh-item">
              <span className="wh-item-meta">
                {tagFor(s)} · {s.clubName}
                {s.matchDate ? ` · ${formatTimeAgo(s.matchDate)}` : ''}
              </span>
              <span className="wh-item-title">{s.title}</span>
              <span className="wh-item-proof">{s.proofLabel}</span>
            </Link>
          )
        })
      )}
    </div>
  )
}