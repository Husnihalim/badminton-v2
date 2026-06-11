import { Newspaper } from 'lucide-react'
import { Badge } from '../../../components/ui/badge'
import { MomentCard } from '../../../components/MomentCard'
import { buildStoryMomentShareText, type StoryMoment } from '../../../lib/storyMoments'
import { useNotifications } from '../../../context/NotificationsContext'
import { useAuth } from '../../../context/AuthContext'

interface SportsStoryFeedProps {
  storyMoments: StoryMoment[]
}

export default function SportsStoryFeed({ storyMoments }: SportsStoryFeedProps) {
  const { user } = useAuth()
  const { showToast } = useNotifications()

  const handleCopyStoryMoment = async (moment: StoryMoment) => {
    if (!user) return
    const userName = user.display_name || user.name
    await navigator.clipboard.writeText(buildStoryMomentShareText(moment, userName))
    showToast('Story copied with proof.', 'success')
  }

  return (
    <section className="app-section space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="app-section-header">
          <h2 className="app-section-title">
            <Newspaper size={18} className="text-[var(--arena-accent)]" aria-hidden="true" />
            My Sports Story
          </h2>
          <p className="app-section-subtitle">
            Latest proof-backed moments from your recorded matches.
          </p>
        </div>
        {storyMoments.length ? (
          <Badge className="w-fit border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
            {storyMoments.length} moments
          </Badge>
        ) : null}
      </div>

      {storyMoments.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {storyMoments.map((moment) => (
            <MomentCard key={moment.id} moment={moment} onShare={handleCopyStoryMoment} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/70 p-5 text-center">
          <p className="text-sm font-semibold text-[var(--arena-text-muted)]">
            Record a scored match to unlock your first match report.
          </p>
        </div>
      )}
    </section>
  )
}
