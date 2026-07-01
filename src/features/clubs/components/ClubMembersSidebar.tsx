import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, ArrowRight, MapPin, ExternalLink, Info } from 'lucide-react'
import { useClub, useClubMembers, useAllClubMatches } from '../hooks/useClubQueries'
import { THEME_MAP } from '../constants'
import { Card, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'

interface ClubMembersSidebarProps {
  clubId: string
  hideRosterPreview?: boolean
}

export function ClubMembersSidebar({ clubId, hideRosterPreview = false }: ClubMembersSidebarProps) {
  const { data: club } = useClub(clubId)
  const { data: members = [], isLoading: membersLoading } = useClubMembers(clubId)
  const { data: matches = [] } = useAllClubMatches(clubId)

  // Calculate doubles combinations client-side
  const topDoublesPairs = useMemo(() => {
    const doublesPairs = new Map<string, { wins: number; losses: number; matches: number }>()
    const doublesMatches = matches.filter(m => m.match_type === 'doubles')
    
    for (const match of doublesMatches) {
      const scoreSets = match.score_sets || []
      if (scoreSets.length === 0) continue

      const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
      const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
      if (team1Sets === team2Sets) continue

      const winningTeam = team1Sets > team2Sets ? 1 : 2

      const team1Participants = match.participants.filter(p => p.team === 1).map(p => p.name || p.guest_name || 'Guest')
      const team2Participants = match.participants.filter(p => p.team === 2).map(p => p.name || p.guest_name || 'Guest')

      if (team1Participants.length === 2) {
        team1Participants.sort()
        const pairKey = team1Participants.join(' & ')
        const stats = doublesPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
        stats.matches++
        if (winningTeam === 1) stats.wins++
        else stats.losses++
        doublesPairs.set(pairKey, stats)
      }

      if (team2Participants.length === 2) {
        team2Participants.sort()
        const pairKey = team2Participants.join(' & ')
        const stats = doublesPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
        stats.matches++
        if (winningTeam === 2) stats.wins++
        else stats.losses++
        doublesPairs.set(pairKey, stats)
      }
    }

    return Array.from(doublesPairs.entries())
      .map(([names, stats]) => {
        const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0
        return { names, ...stats, winRate }
      })
      .filter(p => p.matches >= 2)
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches)
      .slice(0, 3)
  }, [matches])

  if (!club) return null

  const accent = club.accent_color || 'emerald'
  const theme = THEME_MAP[accent] || THEME_MAP.emerald

  const locationQuery = [club.location, club.city].filter(Boolean).join(', ')
  const mapUrl = locationQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}` : ''

  return (
    <div className="space-y-5">
      {/* Club Information Card */}
      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <h2 className="text-lg font-bold text-[var(--arena-text)] flex items-center gap-2">
            <Info size={18} className={`${theme.text} shrink-0`} />
            Club Information
          </h2>
          
          {club.description ? (
            <p className="text-sm text-[var(--arena-text-muted)] leading-relaxed whitespace-pre-wrap">
              {club.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--arena-text-dim)] italic">
              No description provided yet.
            </p>
          )}

          {locationQuery ? (
            <div className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/50 p-3 space-y-3">
              <div className="flex items-start gap-2.5 text-sm text-[var(--arena-text-muted)]">
                <MapPin size={16} className="text-[var(--arena-text-dim)] mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="block font-semibold text-xs text-[var(--arena-text-dim)] uppercase tracking-wider">Base Location</span>
                  <span className="break-words text-[var(--arena-text)]">{locationQuery}</span>
                </div>
              </div>
              <a 
                className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--arena-text-muted)] hover:bg-[var(--arena-surface-muted)] shadow-sm transition-colors"
                href={mapUrl} 
                target="_blank" 
                rel="noreferrer"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Open in Maps
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {topDoublesPairs.length ? (
        <Card>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <h2 className="text-lg font-bold text-[var(--arena-text)] flex items-center gap-2">
              <Trophy size={18} className="text-warning font-bold" />
              Top Doubles Pairs
            </h2>
            <p className="text-xs text-[var(--arena-text-dim)]">Unbeatable combinations (played at least 2 matches together).</p>
            <div className="space-y-2">
              {topDoublesPairs.map((pair, index) => (
                <div key={pair.names} className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[var(--arena-text-dim)]">#{index + 1}</span>
                      <span className="truncate font-semibold text-[var(--arena-text)] text-sm">{pair.names}</span>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-[var(--arena-text-dim)]">
                      <span>{pair.matches} Matches</span>
                      <span>{pair.wins} Wins</span>
                      <span>{pair.winRate}% Win Rate</span>
                    </div>
                  </div>
                  <Badge className="border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] font-bold shrink-0">
                    {pair.wins} - {pair.losses}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!hideRosterPreview && (
        <Card>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--arena-text)]">Members</h2>
              <Link to={`/club/${clubId}?tab=members`} className={`inline-flex items-center gap-1 text-sm font-semibold ${theme.text}`}>
                View all <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {members.length ? (
              <div className="space-y-2">
                {members.slice(0, 5).map((member) => {
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--arena-border)] p-3 bg-[var(--arena-surface)] shadow-sm hover:border-[var(--arena-text-dim)] transition">
                      <div className="flex items-center gap-2 min-w-0">
                        {member.user_id ? (
                          <Link to={`/member/${member.user_id}`} className="shrink-0 flex items-center">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-[var(--arena-border)]" />
                            ) : (
                              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[9px] font-bold text-[var(--arena-text-muted)] border border-[var(--arena-border)] uppercase">
                                {(member.name || 'U').charAt(0)}
                              </div>
                            )}
                          </Link>
                        ) : (
                          member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="h-[20px] w-[20px] rounded-full object-cover border border-[var(--arena-border)] shrink-0" />
                          ) : (
                            <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[9px] font-bold text-[var(--arena-text-muted)] border border-[var(--arena-border)] uppercase">
                              {(member.name || 'U').charAt(0)}
                            </div>
                          )
                        )}
                        <span className="min-w-0 truncate font-semibold text-[var(--arena-text)]">
                          <Link to={`/member/${member.user_id}`} className={`hover:underline ${theme.text}`}>
                            {member.name || 'Unknown member'}
                          </Link>
                        </span>
                        <Badge className="text-[9px] bg-[var(--arena-surface-muted)] border-[var(--arena-border)] text-[var(--arena-text-muted)] capitalize font-medium shrink-0">{member.role}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-dim)]">
                {membersLoading ? 'Loading members...' : 'No members yet.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
