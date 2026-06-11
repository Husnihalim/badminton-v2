import { useState } from 'react'
import { Search, ClipboardPenLine } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useClub, useAllClubMatches, useMyMembership } from '../hooks/useClubQueries'
import { useDeleteMatch } from '../../hooks/useMutations'
import { MatchScoreboard } from '../../../components/MatchScoreboard'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent } from '../../../components/ui/card'
import type { MatchWithDetails } from '../../../types'

interface ClubScoresFeedProps {
  clubId: string
  onRecordScore: () => void
  onEditMatch: (match: MatchWithDetails) => void
  onShareMatch: (match: MatchWithDetails) => void
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
}

export function ClubScoresFeed({
  clubId,
  onRecordScore,
  onEditMatch,
  onShareMatch,
  setSuccessMessage,
  setActionError
}: ClubScoresFeedProps) {
  const { user } = useAuth()
  const { data: club } = useClub(clubId)
  const { data: myMembership } = useMyMembership(clubId, !!user)
  const { data: matches = [], isLoading: matchesLoading } = useAllClubMatches(clubId)

  const deleteMatchMutation = useDeleteMatch(clubId)

  const [showAllMatches, setShowAllMatches] = useState(false)
  const [matchSearchQuery, setMatchSearchQuery] = useState('')

  if (!club) return null

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = !!myMembership

  const filteredMatches = matches.filter((match) => {
    if (!matchSearchQuery.trim()) return true
    const query = matchSearchQuery.toLowerCase().trim()
    return match.participants.some((p) => {
      const name = p.name || p.guest_name || ''
      return name.toLowerCase().includes(query)
    })
  })

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Delete this score? This action cannot be undone.')) {
      return
    }

    try {
      await deleteMatchMutation.mutateAsync(matchId)
      setSuccessMessage('Score deleted successfully.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete score')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4 sm:pt-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-[var(--arena-text)]">Recent scores</h2>
          {isMember && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex items-center justify-center gap-1.5"
              onClick={onRecordScore}
            >
              <ClipboardPenLine size={14} className="text-[var(--arena-text-muted)]" />
              Record Score
            </Button>
          )}
        </div>

        {matches.length ? (
          <div className="space-y-3">
            {showAllMatches && (
              <div className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--arena-text-dim)]" size={16} aria-hidden="true" />
                <Input
                  type="text"
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                  placeholder="Search matches by player name..."
                />
              </div>
            )}
            {showAllMatches && filteredMatches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
                No matches found matching "{matchSearchQuery}".
              </p>
            ) : (
              (showAllMatches ? filteredMatches : matches.slice(0, 5)).map((match) => (
                <MatchScoreboard
                  key={match.id}
                  match={match}
                  onShare={onShareMatch}
                  isAdmin={isAdmin}
                  onEdit={onEditMatch}
                  onDelete={handleDeleteMatch}
                  showClubName={false}
                />
              ))
            )}
            {matches.length > 5 && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowAllMatches(!showAllMatches)
                  if (showAllMatches) {
                    setMatchSearchQuery('')
                  }
                }}
              >
                {showAllMatches ? 'Show Less' : `View All Matches (${matches.length})`}
              </Button>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
            {matchesLoading ? 'Loading scores...' : 'No results recorded yet.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
