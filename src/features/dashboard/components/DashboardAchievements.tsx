import { Trophy } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface Achievements {
  onFire: boolean
  giantSlayer: boolean
  cleanSweep: boolean
  ironMan: boolean
  dynamicDuo: boolean
}

interface DashboardAchievementsProps {
  achievements: Achievements
}

export default function DashboardAchievements({ achievements }: DashboardAchievementsProps) {
  return (
    <section className="app-section space-y-4">
      <div className="app-section-header">
        <h2 className="app-section-title">
          <Trophy size={18} className="text-warning shrink-0" />
          Achievements & Milestones
        </h2>
        <p className="app-section-subtitle">
          Unlock badges by playing and winning matches in your clubs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <AchievementBadge
          unlocked={achievements.onFire}
          title="On Fire"
          description="3+ Win Streak"
          icon="🔥"
          glowClass="shadow-warning/10 border-warning/20 bg-warning-soft text-warning"
          lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
        />
        <AchievementBadge
          unlocked={achievements.giantSlayer}
          title="Giant Slayer"
          description="Beat a higher rank"
          icon="🛡️"
          glowClass="shadow-info/10 border-info/20 bg-info-soft text-info"
          lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
        />
        <AchievementBadge
          unlocked={achievements.cleanSweep}
          title="Clean Sweep"
          description="Win set by 10+ pts"
          icon="🎯"
          glowClass="shadow-success/10 border-success-soft bg-success-soft text-success"
          lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
        />
        <AchievementBadge
          unlocked={achievements.ironMan}
          title="Iron Man"
          description="Play 3+ matches in 1 day"
          icon="🚀"
          glowClass="shadow-danger/10 border-danger/20 bg-danger-soft text-danger"
          lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
        />
        <AchievementBadge
          unlocked={achievements.dynamicDuo}
          title="Dynamic Duo"
          description="3+ doubles streak"
          icon="🤝"
          glowClass="shadow-warning/10 border-warning/20 bg-warning-soft text-warning"
          lockedClass="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
        />
      </div>
    </section>
  )
}

function AchievementBadge({
  unlocked,
  title,
  description,
  icon,
  glowClass,
  lockedClass,
}: {
  unlocked: boolean
  title: string
  description: string
  icon: string
  glowClass: string
  lockedClass: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-28 flex-col items-center justify-center rounded-lg border p-3 text-center space-y-1 transition-colors duration-150 shadow-sm",
        unlocked ? glowClass : lockedClass,
        unlocked && "hover:border-[var(--arena-border)] hover:bg-surface"
      )}
    >
      <span className={cn("text-2xl", !unlocked && "grayscale filter")}>{icon}</span>
      <span className="text-xs font-bold">{title}</span>
      <span className="text-[9px] leading-tight text-[var(--arena-text-dim)]">
        {description}
      </span>
    </div>
  )
}
