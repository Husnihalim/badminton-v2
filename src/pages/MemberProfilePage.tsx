import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Activity, Flame, Percent, Shield, Trophy, ChevronLeft } from 'lucide-react'
import { getProfile, getClubMatches, getClubLeaderboard } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Club, MatchWithDetails, User } from '../types'

import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page } from '../components/ui/page'
import { cn } from '../lib/utils'
import { MatchScoreboard } from '../components/MatchScoreboard'
import ScorecardShareModal from '../components/ScorecardShareModal'
import { PlayerCard } from '../components/PlayerCard'

type MemberEloHistoryRow = {
  id: string
  rating_before: number
  rating_after: number
  created_at: string
  memberships?: {
    clubs?: {
      name?: string | null
    } | null
  } | null
  matches?: {
    title?: string | null
    match_date?: string | null
  } | null
}

export default function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<User | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareMatch, setShareMatch] = useState<MatchWithDetails | null>(null)
  const [clubElos, setClubElos] = useState<Record<string, number>>({})
  const [clubRanks, setClubRanks] = useState<Record<string, { rank: number; total: number }>>({})
  const [eloHistory, setEloHistory] = useState<MemberEloHistoryRow[]>([])

  const [personalStats, setPersonalStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    streak: 0,
    streakType: null as 'win' | 'loss' | null,
  })

  const [achievements, setAchievements] = useState({
    onFire: false,
    giantSlayer: false,
    cleanSweep: false,
    ironMan: false,
    dynamicDuo: false,
  })

  const isOwner = currentUser?.id === userId
  const showFullProfile = !profile?.is_private || isOwner

  const loadProfileData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')

    try {
      // 1. Fetch Profile Info
      const userProfile = await getProfile(userId)
      if (!userProfile) {
        setError('User profile not found.')
        setLoading(false)
        return
      }
      setProfile(userProfile)

      // 2. Fetch User's Clubs and Elo ratings
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('club_id, elo_rating, clubs(*)')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError)
      }

      const eloMap: Record<string, number> = {}
      const userClubs = (membershipData as unknown as Array<{ club_id: string; elo_rating: number | null; clubs: Club }> || [])
        .map((m) => {
          if (m.club_id && m.elo_rating != null) {
            eloMap[m.club_id] = m.elo_rating
          }
          return m.clubs
        })
        .filter(Boolean)
      setClubs(userClubs)
      setClubElos(eloMap)

      // 3. Fetch Matches if profile is public
      if (!userProfile.is_private || currentUser?.id === userId) {
        const allMatches: MatchWithDetails[] = []
        const clubLeaderboards: Record<string, Record<string, number>> = {}

        // Fetch Elo History
        supabase
          .from('elo_history')
          .select(`
            id,
            rating_before,
            rating_after,
            created_at,
            memberships!inner(user_id, club_id, clubs(name)),
            matches(title, match_date)
          `)
          .eq('memberships.user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data: eloData, error: eloError }) => {
            if (eloError) {
              console.error('Error fetching Elo history:', eloError)
            } else {
              setEloHistory((eloData || []) as unknown as MemberEloHistoryRow[])
            }
          })

        // Fetch matches and leaderboards for each club
        await Promise.all(
          userClubs.map(async (club) => {
            try {
              const [clubMatches, leaderboardRows] = await Promise.all([
                getClubMatches(club.id),
                getClubLeaderboard(club.id, 100)
              ])
              
              allMatches.push(...clubMatches)

              // Build leaderboard map and capture this user's rank
              const lbMap: Record<string, number> = {}
              if (leaderboardRows.length) {
                leaderboardRows.forEach((row, rIdx) => {
                  lbMap[row.name.toLowerCase()] = rIdx + 1
                })
                 // Find rank for the viewed user (match by display_name or name)
                 const normalize = (value?: string | null) => (value || '').trim().toLowerCase()
                 const viewedName = normalize(userProfile.display_name) || normalize(userProfile.name)
                 const userRankPos = leaderboardRows.findIndex(
                   row => normalize(row.name) === viewedName || normalize(row.name) === normalize(userProfile.name)
                 )
                if (userRankPos !== -1) {
                  setClubRanks(prev => ({
                    ...prev,
                    [club.id]: { rank: userRankPos + 1, total: leaderboardRows.length }
                  }))
                }
              }
              clubLeaderboards[club.id] = lbMap
            } catch (e) {
              console.error(`Error loading matches for club ${club.id}:`, e)
            }
          })
        )

        // Filter user matches
        const userMatches = allMatches.filter((m) =>
          m.participants.some((p) => p.user_id === userId)
        )

        // Sort user matches chronologically descending
        userMatches.sort((a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime())
        setMatches(userMatches.slice(0, 5))

        // Calculate personal stats
        let wins = 0
        let losses = 0
        let streakCount = 0
        let activeStreakType: 'win' | 'loss' | null = null
        let isStreakBroken = false

        for (let i = 0; i < userMatches.length; i++) {
          const m = userMatches[i]
          const userPart = m.participants.find((p) => p.user_id === userId)
          if (!userPart) continue

          const scoreSets = m.score_sets || []
          if (scoreSets.length === 0) continue

          const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
          const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
          if (team1Sets === team2Sets) continue // skip draw

          const winningTeam = team1Sets > team2Sets ? 1 : 2
          const isWin = userPart.team === winningTeam

          if (isWin) {
            wins++
          } else {
            losses++
          }

          // Calculate streak
          if (!isStreakBroken) {
            if (activeStreakType === null) {
              activeStreakType = isWin ? 'win' : 'loss'
              streakCount = 1
            } else if (activeStreakType === 'win' && isWin) {
              streakCount++
            } else if (activeStreakType === 'loss' && !isWin) {
              streakCount++
            } else {
              isStreakBroken = true
            }
          }
        }

        setPersonalStats({
          matchesPlayed: userMatches.length,
          wins,
          losses,
          winRate: userMatches.length > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0,
          streak: activeStreakType === null ? 0 : streakCount,
          streakType: activeStreakType,
        })

        // Calculate Achievements
        // 1. On Fire (🔥)
        const onFire = activeStreakType === 'win' && streakCount >= 3

        // 2. Clean Sweep (🎯)
        let cleanSweep = false
        for (const m of userMatches) {
          const userPart = m.participants.find((p) => p.user_id === userId)
          if (!userPart) continue
          const scoreSets = m.score_sets || []
          for (const set of scoreSets) {
            const diff = userPart.team === 1 
              ? set.team1_score - set.team2_score 
              : set.team2_score - set.team1_score
            if (diff >= 10) {
              cleanSweep = true
              break
            }
          }
          if (cleanSweep) break
        }

        // 3. Iron Man (🚀)
        const matchesByDate: Record<string, number> = {}
        userMatches.forEach((m) => {
          const dateStr = new Date(m.match_date || m.created_at).toISOString().split('T')[0]
          matchesByDate[dateStr] = (matchesByDate[dateStr] || 0) + 1
        })
        const ironMan = Object.values(matchesByDate).some((count) => count >= 3)

        // 4. Dynamic Duo (🤝)
        const partnerStreaks: Record<string, number> = {}
        let dynamicDuo = false
        const chronoMatches = [...userMatches].reverse()
        for (const m of chronoMatches) {
          const userPart = m.participants.find((p) => p.user_id === userId)
          if (!userPart) continue
          if (m.match_type !== 'doubles') continue

          const partnerPart = m.participants.find((p) => p.team === userPart.team && p.user_id !== userId)
          if (!partnerPart) continue
          const partnerKey = partnerPart.user_id || partnerPart.name || partnerPart.guest_name || 'partner'

          const scoreSets = m.score_sets || []
          if (scoreSets.length === 0) continue
          const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
          const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
          if (team1Sets === team2Sets) continue

          const winningTeam = team1Sets > team2Sets ? 1 : 2
          const isWin = userPart.team === winningTeam

          if (isWin) {
            partnerStreaks[partnerKey] = (partnerStreaks[partnerKey] || 0) + 1
            if (partnerStreaks[partnerKey] >= 3) {
              dynamicDuo = true
            }
          } else {
            partnerStreaks[partnerKey] = 0
          }
        }

        // 5. Giant Slayer (🛡️)
        let giantSlayer = false
        for (const m of userMatches) {
          const userPart = m.participants.find((p) => p.user_id === userId)
          if (!userPart) continue
          const lbMap = clubLeaderboards[m.club_id]
          if (!lbMap) continue

          const userRank = lbMap[userProfile.name.toLowerCase()]
          if (!userRank) continue

          const scoreSets = m.score_sets || []
          if (scoreSets.length === 0) continue
          const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
          const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
          if (team1Sets === team2Sets) continue

          const winningTeam = team1Sets > team2Sets ? 1 : 2
          const isWin = userPart.team === winningTeam

          if (isWin) {
            const opponentTeam = userPart.team === 1 ? 2 : 1
            const opponents = m.participants.filter((p) => p.team === opponentTeam)
            for (const opp of opponents) {
              const oppName = opp.name || opp.guest_name || ''
              const oppRank = lbMap[oppName.toLowerCase()]
              if (oppRank && oppRank < userRank) {
                giantSlayer = true
                break
              }
            }
          }
          if (giantSlayer) break
        }

        setAchievements({ onFire, giantSlayer, cleanSweep, ironMan, dynamicDuo })
      }
    } catch (err) {
      console.error('Error loading profile data:', err)
      setError('Failed to load profile details.')
    } finally {
      setLoading(false)
    }
  }, [userId, currentUser])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfileData()
  }, [loadProfileData])

  if (loading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading profile...</CardContent>
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="space-y-4 pt-5 text-center">
          <p className="text-sm text-red-600 font-semibold">{error || 'An error occurred.'}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }



  return (
    <Page>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-[var(--arena-text-muted)] hover:text-slate-900 pl-0">
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      {/* Player Identity Card — Arena Style */}
      <PlayerCard
        profile={profile}
        stats={{
          matchesPlayed: personalStats.matchesPlayed,
          wins: personalStats.wins,
          losses: personalStats.losses,
          winRate: personalStats.winRate,
          streak: personalStats.streak,
          streakType: personalStats.streakType,
          form: matches.slice(0, 5).map((m) => {
            const userPart = m.participants?.find(p => p.user_id === userId)
            const t1Sets = m.score_sets?.filter(s => s.team1_score > s.team2_score).length || 0
            const t2Sets = m.score_sets?.filter(s => s.team2_score > s.team1_score).length || 0
            const won = userPart ? ((t1Sets > t2Sets && userPart.team === 1) || (t2Sets > t1Sets && userPart.team === 2)) : false
            const setScores = m.score_sets?.map(s => `${s.team1_score}-${s.team2_score}`).join(', ') || ''
            return { won, setScores }
          })
        }}
        rank={(() => {
          const primaryClub = clubs[0]
          const r = primaryClub ? clubRanks[primaryClub.id] : null
          return r ? { rank: r.rank, total: r.total } : null
        })()}
        elo={clubs[0] ? clubElos[clubs[0].id] : null}
        isOwner={isOwner}
        showH2HButton={true}
        className="mb-6"
      />

      {showFullProfile ? (
        <div className="space-y-6">
          {/* Stats Summary Grid */}
          <section className="space-y-4 rounded-xl border border-[var(--arena-border)] bg-surface p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--arena-text)] flex items-center gap-2">
                <Activity size={18} className="text-[var(--arena-accent)] shrink-0" />
                Performance Metrics
              </h2>
              <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">Calculated across all registered club matches.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 bg-[var(--arena-surface-muted)] p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-[var(--arena-text-dim)]">Played</span>
                <p className="text-xl font-extrabold text-[var(--arena-text)]">{personalStats.matchesPlayed}</p>
                <span className="text-[10px] text-[var(--arena-text-dim)]">Total Matches</span>
              </div>

              <div className="rounded-lg border border-slate-100 bg-[var(--arena-surface-muted)] p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-[var(--arena-text-dim)]">Win / Loss</span>
                <p className="text-xl font-extrabold text-[var(--arena-text)]">
                  <span className="text-[var(--arena-accent)]">{personalStats.wins}W</span>
                  <span className="text-[var(--arena-text-dim)] mx-1">-</span>
                  <span className="text-red-600">{personalStats.losses}L</span>
                </p>
                <span className="text-[10px] text-[var(--arena-text-dim)]">Record</span>
              </div>

              <div className="rounded-lg border border-slate-100 bg-[var(--arena-surface-muted)] p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-[var(--arena-text-dim)]">Win Rate</span>
                <div className="flex items-center justify-center gap-1">
                  <Percent size={14} className="text-[var(--arena-accent)] shrink-0" />
                  <span className="text-xl font-extrabold text-[var(--arena-text)]">{personalStats.winRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden max-w-[80px] mx-auto">
                  <div className="bg-[var(--arena-accent)] h-1.5 rounded-full" style={{ width: `${personalStats.winRate}%` }}></div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-[var(--arena-surface-muted)] p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-[var(--arena-text-dim)]">Streak</span>
                <div className="flex items-center justify-center gap-1">
                  {personalStats.streakType === 'win' ? (
                    <>
                      <Flame size={16} className="text-amber-500 animate-pulse" />
                      <span className="text-xl font-extrabold text-amber-600">{personalStats.streak} Win</span>
                    </>
                  ) : personalStats.streakType === 'loss' ? (
                    <span className="text-xl font-extrabold text-[var(--arena-text-muted)]">-{personalStats.streak} Loss</span>
                  ) : (
                    <span className="text-xl font-extrabold text-[var(--arena-text-dim)]">0</span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--arena-text-dim)]">Active Run</span>
              </div>
            </div>
          </section>

          {/* Elo History Card */}
          {eloHistory.length > 0 && (
            <section className="space-y-4 rounded-xl border border-[var(--arena-border)] bg-surface p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-lg font-bold text-[var(--arena-text)] flex items-center gap-2">
                  <Activity size={18} className="text-[var(--arena-accent)] shrink-0" />
                  Elo Rating Progression
                </h2>
                <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">Recent rating changes from club matches.</p>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {eloHistory.map((item) => {
                  const ratingDiff = item.rating_after - item.rating_before
                  const isGain = ratingDiff >= 0
                  const clubName = item.memberships?.clubs?.name || 'Club'
                  const matchTitle = item.matches?.title || 'Match'
                  const dateStr = new Date(item.matches?.match_date || item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 truncate block">
                          {matchTitle}
                        </span>
                        <span className="text-[10px] text-[var(--arena-text-dim)] font-semibold block">
                          {clubName} · {dateStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-[var(--arena-text-dim)]">
                          {item.rating_before} → <span className="font-extrabold text-slate-900">{item.rating_after}</span>
                        </span>
                        <span className={cn(
                          "inline-flex items-center justify-center font-extrabold px-1.5 py-0.5 rounded text-[10px] w-12 text-center",
                          isGain 
                            ? "bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-emerald-100" 
                            : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                          {isGain ? `+${ratingDiff}` : ratingDiff}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Achievements Medals Grid */}
          <section className="space-y-4 rounded-xl border border-[var(--arena-border)] bg-surface p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--arena-text)] flex items-center gap-2">
                <Trophy size={18} className="text-amber-500 shrink-0" />
                Unlocked Achievements
              </h2>
              <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">Badges earned by this player from club gameplay.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <AchievementBadge
                unlocked={achievements.onFire}
                title="On Fire"
                description="3+ Win Streak"
                icon="🔥"
                glowClass="shadow-orange-500/10 border-orange-200 bg-orange-50/50 text-orange-600"
                lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.giantSlayer}
                title="Giant Slayer"
                description="Beat a higher rank"
                icon="🛡️"
                glowClass="shadow-blue-500/10 border-blue-200 bg-blue-50/50 text-blue-600"
                lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.cleanSweep}
                title="Clean Sweep"
                description="Win set by 10+ pts"
                icon="🎯"
                glowClass="shadow-emerald-500/10 border-emerald-200 bg-[var(--arena-accent-soft)]/50 text-[var(--arena-accent)]"
                lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.ironMan}
                title="Iron Man"
                description="Play 3+ matches in 1 day"
                icon="🚀"
                glowClass="shadow-purple-500/10 border-purple-200 bg-purple-50/50 text-purple-600"
                lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.dynamicDuo}
                title="Dynamic Duo"
                description="3+ doubles streak"
                icon="🤝"
                glowClass="shadow-amber-500/10 border-amber-200 bg-amber-50/50 text-amber-600"
                lockedClass="border-slate-100 bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] opacity-40"
              />
            </div>
          </section>

          {/* Recent Match Log */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Recent Matches</h2>
            {matches.length ? (
              <div className="grid gap-3">
                {matches.map((match) => (
                  <MatchScoreboard
                    key={match.id}
                    match={match}
                    onShare={setShareMatch}
                    showClubName={true}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-dim)]">
                No matches recorded yet.
              </p>
            )}
          </section>
        </div>
      ) : (
        /* Private Profile Notice */
        <div className="rounded-xl border border-dashed border-[var(--arena-border)] p-8 text-center bg-[var(--arena-surface-muted)] mt-6 space-y-3">
          <Shield size={36} className="text-[var(--arena-text-dim)] mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Stats are private</h2>
          <p className="text-sm text-[var(--arena-text-dim)] max-w-sm mx-auto">
            This member has set their profile to private. Their stats, milestones, and match logs are hidden.
          </p>
        </div>
      )}
      {shareMatch ? (
        <ScorecardShareModal
          match={shareMatch}
          clubName={shareMatch.clubName || 'Club'}
          onClose={() => setShareMatch(null)}
        />
      ) : null}
    </Page>
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
        "flex flex-col items-center justify-center p-3 rounded-xl border text-center space-y-1 transition duration-305 shadow-sm",
        unlocked ? glowClass : lockedClass,
        unlocked && "hover:-translate-y-1 hover:shadow-md"
      )}
    >
      <span className={cn("text-2xl", !unlocked && "grayscale filter")}>{icon}</span>
      <span className="text-xs font-bold">{title}</span>
      <span className="text-[9px] leading-tight text-[var(--arena-text-dim)]">{description}</span>
    </div>
  )
}
