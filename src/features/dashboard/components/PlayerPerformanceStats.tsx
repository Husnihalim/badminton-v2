import { type ReactNode } from 'react'
import { Activity, CalendarDays, Flame, Percent, Trophy, Users } from 'lucide-react'
import { Card, CardContent } from '../../../components/ui/card'

interface PersonalStats {
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  streak: number
  streakType: 'win' | 'loss' | null
}

interface PlayerPerformanceStatsProps {
  clubCount: number
  upcomingEvents: number
  totalMatches: number
  personalStats: PersonalStats
}

export default function PlayerPerformanceStats({
  clubCount,
  upcomingEvents,
  totalMatches,
  personalStats,
}: PlayerPerformanceStatsProps) {
  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={<Users size={17} />} label="Clubs" value={clubCount} />
        <StatCard
          icon={<CalendarDays size={17} />}
          label="Events"
          value={upcomingEvents}
        />
        <StatCard icon={<Trophy size={17} />} label="Matches" value={totalMatches} />
      </div>

      {/* Personal Player Performance Section */}
      <section className="app-section space-y-4">
        <div className="app-section-header">
          <h2 className="app-section-title">
            <Activity size={18} className="text-[var(--arena-accent)]" />
            Your Performance
          </h2>
          <p className="app-section-subtitle">
            Calculated from all matches played across your clubs.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="metric-tile space-y-1 text-center">
            <span className="metric-label">Played</span>
            <p className="metric-value">{personalStats.matchesPlayed}</p>
            <span className="metric-note">Total Matches</span>
          </div>

          <div className="metric-tile space-y-1 text-center">
            <span className="metric-label">Win / Loss</span>
            <p className="metric-value">
              <span className="text-[var(--arena-accent)]">{personalStats.wins}W</span>
              <span className="text-[var(--arena-text-dim)] mx-1">-</span>
              <span className="text-red-400">{personalStats.losses}L</span>
            </p>
            <span className="metric-note">Record</span>
          </div>

          <div className="metric-tile space-y-1 text-center">
            <span className="metric-label">Win Rate</span>
            <div className="flex items-center justify-center gap-1">
              <Percent size={14} className="text-[var(--arena-accent)] shrink-0" />
              <span className="metric-value">{personalStats.winRate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden max-w-[80px] mx-auto">
              <div
                className="bg-[var(--arena-accent)] h-1.5 rounded-full"
                style={{ width: `${personalStats.winRate}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-tile space-y-1 text-center">
            <span className="metric-label">Active Streak</span>
            <div className="flex items-center justify-center gap-1">
              {personalStats.streakType === 'win' ? (
                <>
                  <Flame size={16} className="text-amber-500 animate-pulse" />
                  <span className="metric-value text-amber-400">
                    {personalStats.streak} Win
                  </span>
                </>
              ) : personalStats.streakType === 'loss' ? (
                <span className="metric-value text-[var(--arena-text-muted)]">
                  -{personalStats.streak} Loss
                </span>
              ) : (
                <span className="metric-value text-[var(--arena-text-dim)]">0</span>
              )}
            </div>
            <span className="metric-note">Current Run</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-[var(--arena-text-dim)]">
          <span className="text-xs font-semibold sm:text-sm">{label}</span>
          <span className="rounded-md bg-[var(--arena-accent-soft)] p-1.5 text-[var(--arena-accent)]">
            {icon}
          </span>
        </div>
        <p className="text-2xl font-semibold leading-none text-[var(--arena-text)] sm:text-3xl">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
