import { MatchScoreboard } from '../../../components/MatchScoreboard'
import type { MatchWithDetails } from '../../../types'

type DashboardMatch = MatchWithDetails & { clubName?: string }

interface DashboardRecentMatchesProps {
  matches: DashboardMatch[]
  onShareMatch: (match: DashboardMatch) => void
}

export default function DashboardRecentMatches({
  matches,
  onShareMatch,
}: DashboardRecentMatchesProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--arena-text)]">Recent match results</h2>
      {matches.length ? (
        <div className="grid gap-3">
          {matches.map((match) => (
            <MatchScoreboard
              key={match.id}
              match={match}
              onShare={onShareMatch}
              showClubName={true}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">No matches recorded yet.</p>
      )}
    </section>
  )
}
