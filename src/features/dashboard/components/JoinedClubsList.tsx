import { Link } from 'react-router-dom'
import { Club as ClubIcon, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'

interface ClubRank {
  rank: number
  total: number
}

interface JoinedClub {
  id: string
  name: string
  description?: string | null
  city?: string | null
  membersCount?: number
  members_count?: number
  role?: string
  rank?: ClubRank | null
}

interface JoinedClubsListProps {
  clubs: JoinedClub[]
}

export default function JoinedClubsList({ clubs }: JoinedClubsListProps) {
  return (
    <section className="space-y-4" data-tour-id="joined-clubs-list">
      <h2 className="text-lg font-bold text-[var(--arena-text)]">Your clubs</h2>
      {clubs.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => {
            const members = club.membersCount ?? club.members_count ?? 0
            const rankInfo = club.rank

            return (
              <Link key={club.id} to={`/club/${club.id}`} className="block">
                <Card className="h-full transition hover:border-[var(--arena-accent)]/40 hover:shadow-md">
                  <CardContent className="space-y-3 pt-4 sm:pt-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
                        <ClubIcon size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-[var(--arena-text)]">
                          {club.name}
                        </h3>
                        <p className="line-clamp-2 text-sm leading-6 text-[var(--arena-text-muted)]">
                          {club.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--arena-text-dim)]">
                      <span>{club.city}</span>
                      <span>{members} members</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge>{club.role || 'member'}</Badge>
                      {club.role === 'owner' || club.role === 'admin' ? (
                        <Badge className="border-info-soft bg-info-soft text-info">
                          <ShieldCheck size={14} aria-hidden="true" />
                          Admin actions
                        </Badge>
                      ) : null}
                      {rankInfo && rankInfo.rank ? (
                        <Badge className="border-warning-soft bg-warning-soft text-warning font-bold">
                          🏆 Rank #{rankInfo.rank} / {rankInfo.total}
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-5 text-center">
            <p className="text-sm text-[var(--arena-text-muted)]">
              You have not joined any clubs yet.
            </p>
            <a href="#club-discovery" className="brand-button inline-block">
              Find clubs
            </a>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
