import { Share2, Trophy, Zap, Flame, Target } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { FriendlyStoryMoment } from '../../types/friendly'

interface FriendlyStoryCardProps {
  story: FriendlyStoryMoment
  onShare?: () => void
}

const storyTypeConfig: Record<FriendlyStoryMoment['type'], { icon: typeof Trophy; label: string; variant: 'live' | 'blue' | 'heat' | 'muted' }> = {
  friendly_invited: { icon: Target, label: 'Challenge', variant: 'blue' },
  friendly_accepted: { icon: Zap, label: 'Accepted', variant: 'live' },
  matchmaking_complete: { icon: Target, label: 'Locked In', variant: 'blue' },
  upset_alert: { icon: Flame, label: 'Upset', variant: 'heat' },
  clutch_moment: { icon: Target, label: 'Clutch', variant: 'live' },
  comeback_in_progress: { icon: Zap, label: 'Comeback', variant: 'live' },
  friendly_completed: { icon: Trophy, label: 'Complete', variant: 'blue' },
  sweep_victory: { icon: Trophy, label: 'Sweep', variant: 'live' },
  narrow_escape: { icon: Target, label: 'Narrow Win', variant: 'heat' },
  upset_victory: { icon: Flame, label: 'Upset Win', variant: 'heat' },
  rivalry_formed: { icon: Zap, label: 'Rivalry', variant: 'blue' },
}

export function FriendlyStoryCard({ story, onShare }: FriendlyStoryCardProps) {
  const config = storyTypeConfig[story.type]
  const Icon = config.icon

  return (
    <Card className="border-white/10 bg-[#0a0f0e]">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <Badge variant={config.variant} className="gap-1.5">
            <Icon size={12} />
            {config.label}
          </Badge>
          {story.proof && (
            <span className="text-right text-xs font-semibold text-slate-400">
              {story.proof}
            </span>
          )}
        </div>

        <h3 className="arena-heading mb-2 text-xl">{story.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-300">{story.body}</p>

        {onShare && (
          <Button
            type="button"
            size="sm"
            variant="panel"
            onClick={onShare}
            className="gap-2"
          >
            <Share2 size={14} />
            Share this moment
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface FriendlyStoryListProps {
  stories: FriendlyStoryMoment[]
  onShareStory?: (story: FriendlyStoryMoment) => void
}

export function FriendlyStoryList({ stories, onShareStory }: FriendlyStoryListProps) {
  if (stories.length === 0) {
    return (
      <Card className="border-white/10 bg-[#0a0f0e]">
        <CardContent className="p-6 text-center">
          <p className="text-slate-400">Stories will appear as the friendly progresses</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        The Story ({stories.length})
      </p>
      {stories.map((story) => (
        <FriendlyStoryCard
          key={story.id}
          story={story}
          onShare={onShareStory ? () => onShareStory(story) : undefined}
        />
      ))}
    </div>
  )
}
