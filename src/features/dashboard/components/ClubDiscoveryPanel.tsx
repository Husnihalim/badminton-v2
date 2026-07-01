import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { Card, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { useRequestJoinClub } from '../../hooks/useMutations'
import { useNotifications } from '../../../context/NotificationsContext'
import type { Club } from '../../../types'

interface ClubDiscoveryPanelProps {
  discoverableClubs: Club[]
}

export default function ClubDiscoveryPanel({ discoverableClubs }: ClubDiscoveryPanelProps) {
  const navigate = useNavigate()
  const { showToast } = useNotifications()
  const [clubSearchQuery, setClubSearchQuery] = useState('')

  const requestJoinMutation = useRequestJoinClub()

  const filteredDiscoverableClubs = useMemo(() => {
    const query = clubSearchQuery.trim().toLowerCase()
    const clubsToShow = query
      ? discoverableClubs.filter((club) => {
          const searchableText = [
            club.name,
            club.description,
            club.city,
            club.location,
            ...(club.sport_focus || []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return searchableText.includes(query)
        })
      : discoverableClubs

    return clubsToShow.slice(0, query ? 12 : 8)
  }, [clubSearchQuery, discoverableClubs])

  const handleRequestJoinClub = async (club: Club) => {
    try {
      await requestJoinMutation.mutateAsync(club.id)
      showToast(`Join request sent to ${club.name}.`, 'success')
    } catch (err) {
      console.error('Error requesting club join from discovery panel:', err)
      showToast(
        err instanceof Error ? err.message : 'Could not send join request.',
        'error'
      )
    }
  }

  return (
    <section id="club-discovery" className="space-y-4" data-tour-id="club-discovery-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--arena-text)]">Find another club</h2>
          <p className="text-sm text-[var(--arena-text-muted)]">
            Search public clubs and request access from your dashboard.
          </p>
        </div>
        <label className="relative block sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--arena-text-dim)]"
            size={16}
            aria-hidden="true"
          />
          <Input
            value={clubSearchQuery}
            onChange={(event) => setClubSearchQuery(event.target.value)}
            className="pl-9"
            placeholder="Search by club, city, or sport"
          />
        </label>
      </div>

      {filteredDiscoverableClubs.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDiscoverableClubs.map((club) => {
            const isPending = requestJoinMutation.isPending && requestJoinMutation.variables === club.id

            return (
              <Card key={club.id} className="h-full">
                <CardContent className="space-y-3 pt-4 sm:pt-5">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-base font-bold text-[var(--arena-text)]">
                      {club.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-[var(--arena-text-muted)]">
                      {club.description ||
                        'Club workspace for members, sessions, and scores.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--arena-text-dim)]">
                    {club.city ? <span>{club.city}</span> : null}
                    {club.sport_focus?.slice(0, 3).map((sport) => (
                      <Badge key={sport}>{sport}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/club/${club.id}`}>
                      <Button variant="secondary" fullWidth>
                        View
                      </Button>
                    </Link>
                    {club.open_join !== false ? (
                      <Button
                        type="button"
                        fullWidth
                        onClick={() => handleRequestJoinClub(club)}
                        disabled={isPending}
                      >
                        <UserPlus size={16} aria-hidden="true" />
                        {isPending ? 'Sending...' : 'Join'}
                      </Button>
                    ) : (
                      <Button type="button" variant="secondary" fullWidth disabled>
                        Invite only
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-2 pt-5 text-center">
            <p className="text-sm text-[var(--arena-text-muted)]">
              {clubSearchQuery.trim()
                ? 'No clubs match your search.'
                : 'No other clubs are available right now.'}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/profile?create_club=true')}
            >
              Create a club
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
