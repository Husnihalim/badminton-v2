import { Link } from 'react-router-dom'
import { Flame, ArrowRight, UserPlus } from 'lucide-react'
import type { StoryMoment } from '../../lib/storyMoments'
import { formatTimeAgo } from './formatMatch'
import heroBadminton from '../../assets/hero-badminton.webp'
import heroTennis from '../../assets/hero-tennis.webp'
import heroPickleball from '../../assets/hero-pickleball.webp'

interface Props {
  leadStory: StoryMoment | null
  secondaryStories: StoryMoment[]
  heroImage?: string
}

const TAG_BY_TYPE: Record<string, string> = {
  comeback_win: 'Comeback',
  clean_sweep: 'Statement',
  win_streak: 'Streak',
  close_match: 'Nail-biter',
  rivalry_watch: 'Rivalry',
  best_partner: 'Bromance',
  latest_result: 'Result',
  upset_alert: 'Upset',
  narrow_escape: 'Escape',
  clutch_moment: 'Clutch',
  rivalry_formed: 'Rivalry',
}

const SECONDARY_THUMBS = [heroTennis, heroPickleball, heroBadminton]

export default function LeadStoryHero({ leadStory, secondaryStories, heroImage = heroBadminton }: Props) {
  if (!leadStory) return null

  const leadTag = TAG_BY_TYPE[leadStory.type] ?? 'Story'
  const clubPath = leadStory.clubId ? `/club/${leadStory.clubId}` : '/register'
  const when = leadStory.matchDate ? formatTimeAgo(leadStory.matchDate) : null

  return (
    <section className="lead-story">
      <div className="lead-story-media">
        <img src={heroImage} alt="" aria-hidden="true" />
        <div className="lead-story-body">
          <span className="lead-story-chip">
            <Flame size={11} />
            {leadTag} of the week
          </span>

          <span className="lead-story-club-chip">
            {leadStory.clubName ?? 'Grassroots'}
            {when ? ` · ${when}` : ''}
          </span>

          <h1 className="lead-story-headline">{leadStory.title}</h1>
          {leadStory.body && <p className="lead-story-sub">{leadStory.body}</p>}

          <div className="lead-story-cta">
            <Link to={clubPath}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--arena-accent)] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-[var(--arena-accent-text)] shadow-[0_0_20px_rgba(204,255,0,0.35)] hover:shadow-[0_0_28px_rgba(204,255,0,0.55)] transition"
              >
                Read the moment
                <ArrowRight size={14} />
              </button>
            </Link>
            <Link to="/register">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-black/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-black/50 transition"
              >
                <UserPlus size={14} />
                Join this club
              </button>
            </Link>
          </div>

          <span className="lead-story-proof">{leadStory.proofLabel}</span>
        </div>
      </div>

      {secondaryStories.length > 0 && (
        <div className="lead-story-secondary" aria-label="More from the arena">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--arena-text-dim)] mb-1">
            More from the arena
          </div>
          {secondaryStories.slice(0, 3).map((s, i) => (
            <Link key={s.id} to={s.clubId ? `/club/${s.clubId}` : '/'} className="lead-story-secondary-item">
              <img
                className="lead-story-secondary-thumb"
                src={SECONDARY_THUMBS[i % SECONDARY_THUMBS.length]}
                alt=""
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="lead-story-secondary-tag">
                  {TAG_BY_TYPE[s.type] ?? 'Story'} · {s.clubName}
                </span>
                <span className="lead-story-secondary-title">{s.title}</span>
                <span className="lead-story-secondary-meta">{s.proofLabel}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}