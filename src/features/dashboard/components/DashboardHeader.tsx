import { useNavigate } from 'react-router-dom'
import { Club as ClubIcon, Edit3, Trophy, UserPlus } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { PageHeader } from '../../../components/ui/page'
import { PlayerCard, type PlayerCardProps } from '../../../components/PlayerCard'
import type { Club, User } from '../../../types'

interface DashboardHeaderProps {
  user: User
  playerCardStats?: PlayerCardProps['stats']
  primaryClub?: Club & { role?: string }
  primaryRank?: { rank: number; total: number } | null
  primaryElo?: number | null
}

export default function DashboardHeader({
  user,
  playerCardStats,
  primaryClub,
  primaryRank,
  primaryElo,
}: DashboardHeaderProps) {
  const navigate = useNavigate()
  const displayName = user.display_name || user.name
  const firstName = displayName.split(' ')[0] || displayName

  return (
    <>
      <PageHeader
        eyebrow="Personal home"
        title={`Welcome back, ${firstName}`}
        description="Your profile, player card, stats, stories, clubs, and next actions in one place."
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
            <Edit3 size={16} aria-hidden="true" />
            Edit profile
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <PlayerCard
          profile={user}
          stats={playerCardStats}
          rank={primaryRank}
          elo={primaryElo}
          isOwner={true}
          className="bg-slate-955"
        />

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--arena-text)]">Quick actions</h2>
              <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
                Move from your personal page into the next useful task.
              </p>
            </div>
            <div className="grid gap-2">
              <Button
                type="button"
                onClick={() =>
                  navigate(
                    primaryClub ? `/club/${primaryClub.id}` : '/profile?create_club=true'
                  )
                }
                fullWidth
              >
                <ClubIcon size={16} aria-hidden="true" />
                {primaryClub ? 'Open club home' : 'Create first club'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigate(
                    primaryClub
                      ? `/club/${primaryClub.id}`
                      : '/dashboard#club-discovery'
                  )
                }
                fullWidth
              >
                <Trophy size={16} aria-hidden="true" />
                Club score tools
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  document
                    .getElementById('club-discovery')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                fullWidth
              >
                <UserPlus size={16} aria-hidden="true" />
                Join another club
              </Button>
            </div>
            <div className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--arena-text-dim)]">
                Next build
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--arena-text-muted)]">
                Generated card backgrounds and optional portrait enhancement come after the
                player-card profile fields are proven in daily use.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
