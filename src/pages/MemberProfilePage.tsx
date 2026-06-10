import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Activity, Flame, MapPin, Percent, Shield, Trophy, UserRound, ChevronLeft } from 'lucide-react'
import { getProfile, getClubMatches, getClubLeaderboard } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Club, MatchWithDetails, User } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page } from '../components/ui/page'
import { cn } from '../lib/utils'
import { MatchScoreboard } from '../components/MatchScoreboard'
import ScorecardShareModal from '../components/ScorecardShareModal'

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
                const viewedName = userProfile.display_name?.toLowerCase() || userProfile.name.toLowerCase()
                const userRankPos = leaderboardRows.findIndex(
                  row => row.name.toLowerCase() === viewedName
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
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading profile...</CardContent>
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

  const displayName = profile.display_name || profile.name

  return (
    <Page>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-slate-600 hover:text-slate-900 pl-0">
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      {/* Player Identity Card — Arena Style */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900 relative shadow-2xl">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 via-transparent to-blue-900/10" />

        <div className="relative p-5 sm:p-6">
          {/* Status chips row */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#ccff00]/30 bg-[#ccff00]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ccff00]">
              🎴 Player Card
            </span>
            {profile.is_private ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                🔒 Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                🌐 Public Profile
              </span>
            )}
            {profile.gear?.play_style && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                ✦ {profile.gear.play_style.replace(/_/g, ' ')}
              </span>
            )}
            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                You
              </span>
            )}
          </div>

          {/* Avatar + Identity */}
          <div className="flex flex-col items-center text-center space-y-4 sm:flex-row sm:items-start sm:text-left sm:space-y-0 sm:space-x-6">
            <div className="avatar-gradient-outline shrink-0">
              <div className="avatar-gradient-outline-inner h-24 w-24 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={48} className="text-[#ccff00]" />
                )}
              </div>
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-white truncate sm:text-5xl">{displayName}</h1>
              <p className="text-sm text-slate-400">@{profile.name}</p>
              {profile.city && (
                <p className="text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1">
                  <MapPin size={14} className="text-slate-400" />
                  {profile.city}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                <Badge className="bg-emerald-900 hover:bg-emerald-900 border-none capitalize text-white">
                  {profile.preferred_sport || 'badminton'}
                </Badge>
                {profile.gear?.dominant_hand && (
                  <Badge className="bg-slate-800 border-slate-700 text-slate-300 capitalize">
                    {profile.gear.dominant_hand}-handed
                  </Badge>
                )}
                {profile.gear?.player_type && (
                  <Badge className="bg-slate-800 border-slate-700 text-slate-300 capitalize">
                    {profile.gear.player_type.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
              {profile.bio ? (
                <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">{profile.bio}</p>
              ) : (
                <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">Add a short playing bio, social handles, and gear to make this card feel complete.</p>
              )}

          {/* Social handles */}
          {profile.social_links && Object.values(profile.social_links).some(Boolean) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.entries(profile.social_links).filter(([, v]) => Boolean(v)).map(([platform, handle]) => (
                <span key={platform} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface/5 px-2.5 py-0.5 text-xs text-slate-300">
                  {platform === 'instagram' ? '📸' : platform === 'tiktok' ? '🎵' : platform === 'youtube' ? '▶️' : platform === 'facebook' ? '👤' : '🔗'} {handle}
                </span>
              ))}
            </div>
          )}

          {/* Club rankings */}
          {clubs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 self-center">Club Rankings:</span>
              {clubs.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-[#ccff00]/20 bg-[#ccff00]/5 px-2.5 py-0.5 text-xs font-semibold text-[#ccff00]">
                  {c.name}: #{Object.keys(clubElos).indexOf(c.id) + 1 || '—'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stat tiles */}
        {showFullProfile && personalStats.matchesPlayed > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-5 py-4 sm:grid-cols-4 sm:px-6 bg-slate-950/30">
            <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Record</p>
              <p className="mt-1 text-lg font-extrabold text-white">
                <span className="text-emerald-400">{personalStats.wins}W</span>
                <span className="text-slate-600 mx-0.5">-</span>
                <span className="text-red-400">{personalStats.losses}L</span>
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Win Rate</p>
              <p className="mt-1 text-lg font-extrabold text-[#ccff00]">{personalStats.winRate}%</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Form</p>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                {matches.slice(0, 5).map((m, i) => {
                  const userPart = m.participants?.find(p => p.user_id === userId)
                  if (!userPart || !m.score_sets?.length) return <span key={i} className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-extrabold text-white bg-slate-700">?</span>
                  const t1Sets = m.score_sets.filter(s => s.team1_score > s.team2_score).length
                  const t2Sets = m.score_sets.filter(s => s.team2_score > s.team1_score).length
                  const won = (t1Sets > t2Sets && userPart.team === 1) || (t2Sets > t1Sets && userPart.team === 2)
                  return <span key={i} className={cn('inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-extrabold text-white', won ? 'bg-[#84cc16]' : 'bg-red-500')}>{won ? 'W' : 'L'}</span>
                })}
                {matches.length === 0 && <span className="text-xs text-slate-600">—</span>}
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-surface/[0.03] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rank</p>
              <p className="mt-1 text-lg font-extrabold text-white">
                {(() => {
                  const primaryClub = clubs[0]
                  const r = primaryClub ? clubRanks[primaryClub.id] : null
                  return r ? `#${r.rank}/${r.total}` : 'Unranked'
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Gear section — 3 tiles */}
        {profile.gear && Object.values(profile.gear).some(Boolean) && (() => {
          const g = profile.gear!
          const hasRacket = g.racket || g.racket_weight || g.racket_balance || g.racket_stiffness
          const hasStrings = g.strings || g.tension || g.grip_type || g.grip
          const hasShoes = g.shoes
          const hasPlay = g.play_style || g.dominant_hand || g.player_type
          if (!hasRacket && !hasStrings && !hasShoes && !hasPlay) return null
          return (
            <div className="border-t border-white/10 px-5 py-4 sm:px-6 bg-slate-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Player Bag &amp; Specs</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {/* Racket tile */}
                {hasRacket && (
                  <div className="rounded-lg border border-white/5 bg-surface/[0.02] p-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Racket</p>
                    <p className="text-sm font-bold text-slate-100">{g.racket || 'Unspecified'}</p>
                    <p className="text-xs text-slate-400">
                      {[g.racket_weight && `Weight: ${g.racket_weight}`, g.racket_balance && `Balance: ${g.racket_balance.replace(/_/g, ' ')}`, g.racket_stiffness && `Flex: ${g.racket_stiffness}`].filter(Boolean).join(' • ') || 'No specs listed'}
                    </p>
                  </div>
                )}
                {/* Strings & Tension tile */}
                {hasStrings && (
                  <div className="rounded-lg border border-white/5 bg-surface/[0.02] p-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Strings &amp; Tension</p>
                    <p className="text-sm font-bold text-slate-100">{g.strings || 'Unspecified'}</p>
                    <p className="text-xs">
                      {g.tension && <span className="font-bold text-[#ccff00]">Tension: {g.tension}</span>}
                      {g.tension && (g.grip_type || g.grip) && <span className="text-slate-500"> • </span>}
                      {(g.grip_type || g.grip) && <span className="text-slate-400">Grip: {g.grip_type ? g.grip_type.replace(/_/g, ' ') : g.grip}</span>}
                    </p>
                  </div>
                )}
                {/* Shoes + Play Profile tile */}
                {(hasShoes || hasPlay) && (
                  <div className="rounded-lg border border-white/5 bg-surface/[0.02] p-3 space-y-1">
                    {hasShoes && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Court Shoes</p>
                        <p className="text-sm font-bold text-slate-100">{g.shoes}</p>
                      </>
                    )}
                    {hasPlay && (
                      <p className="text-xs text-slate-400 pt-1">
                        {[g.play_style && g.play_style.replace(/_/g, ' '), g.dominant_hand && `${g.dominant_hand}-handed`, g.player_type && g.player_type.replace(/_/g, ' ')].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        <div className="border-t border-white/10 px-5 py-3 sm:px-6 bg-slate-950/10">
          <div className="grid gap-y-1 gap-x-4 sm:grid-cols-4 text-xs mb-3">
            <p className="text-slate-300">Latest match: <span className="font-bold text-white">{matches[0]?.title || '—'}</span></p>
            <p className="text-slate-300">Streak: <span className={`font-bold ${personalStats.streakType === 'win' ? 'text-amber-400' : personalStats.streakType === 'loss' ? 'text-red-400' : 'text-white'}`}>{personalStats.streakType === 'win' ? `🔥 ${personalStats.streak}W` : personalStats.streakType === 'loss' ? `-${personalStats.streak}L` : '—'}</span></p>
            <p className="text-slate-300">Clubs: <span className="font-bold text-white">{clubs.map(c => c.name).join(', ') || '—'}</span></p>
            <p className="text-slate-300">Sport: <span className="font-bold text-white capitalize">{profile.preferred_sport || 'Badminton'}</span></p>
          </div>

          {/* Clubs with Elo */}
          {clubs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {clubs.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface/5 px-2.5 py-0.5 text-xs text-slate-300">
                  {c.name}
                  <span className="text-[#ccff00] font-extrabold text-[10px]">⚡ {clubElos[c.id] ?? 1200}</span>
                </span>
              ))}
            </div>
          )}

          {/* Compare H2H button */}
          {!isOwner && showFullProfile && personalStats.matchesPlayed > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/dashboard?rival=${displayName}`)}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-emerald-900/30"
            >
              ⚔️ Compare Head-to-Head
            </button>
          )}
        </div>
      </div>

      {showFullProfile ? (
        <div className="space-y-6">
          {/* Stats Summary Grid */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Activity size={18} className="text-emerald-700 shrink-0" />
                Performance Metrics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Calculated across all registered club matches.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500">Played</span>
                <p className="text-xl font-extrabold text-slate-950">{personalStats.matchesPlayed}</p>
                <span className="text-[10px] text-slate-400">Total Matches</span>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500">Win / Loss</span>
                <p className="text-xl font-extrabold text-slate-950">
                  <span className="text-emerald-700">{personalStats.wins}W</span>
                  <span className="text-slate-400 mx-1">-</span>
                  <span className="text-red-600">{personalStats.losses}L</span>
                </p>
                <span className="text-[10px] text-slate-400">Record</span>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500">Win Rate</span>
                <div className="flex items-center justify-center gap-1">
                  <Percent size={14} className="text-emerald-700 shrink-0" />
                  <span className="text-xl font-extrabold text-slate-950">{personalStats.winRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden max-w-[80px] mx-auto">
                  <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${personalStats.winRate}%` }}></div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-500">Streak</span>
                <div className="flex items-center justify-center gap-1">
                  {personalStats.streakType === 'win' ? (
                    <>
                      <Flame size={16} className="text-amber-500 animate-pulse" />
                      <span className="text-xl font-extrabold text-amber-600">{personalStats.streak} Win</span>
                    </>
                  ) : personalStats.streakType === 'loss' ? (
                    <span className="text-xl font-extrabold text-slate-600">-{personalStats.streak} Loss</span>
                  ) : (
                    <span className="text-xl font-extrabold text-slate-500">0</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">Active Run</span>
              </div>
            </div>
          </section>

          {/* Elo History Card */}
          {eloHistory.length > 0 && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-700 shrink-0" />
                  Elo Rating Progression
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Recent rating changes from club matches.</p>
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
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {clubName} · {dateStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-slate-500">
                          {item.rating_before} → <span className="font-extrabold text-slate-900">{item.rating_after}</span>
                        </span>
                        <span className={cn(
                          "inline-flex items-center justify-center font-extrabold px-1.5 py-0.5 rounded text-[10px] w-12 text-center",
                          isGain 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
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
          <section className="space-y-4 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Trophy size={18} className="text-amber-500 shrink-0" />
                Unlocked Achievements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Badges earned by this player from club gameplay.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <AchievementBadge
                unlocked={achievements.onFire}
                title="On Fire"
                description="3+ Win Streak"
                icon="🔥"
                glowClass="shadow-orange-500/10 border-orange-200 bg-orange-50/50 text-orange-600"
                lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.giantSlayer}
                title="Giant Slayer"
                description="Beat a higher rank"
                icon="🛡️"
                glowClass="shadow-blue-500/10 border-blue-200 bg-blue-50/50 text-blue-600"
                lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.cleanSweep}
                title="Clean Sweep"
                description="Win set by 10+ pts"
                icon="🎯"
                glowClass="shadow-emerald-500/10 border-emerald-200 bg-emerald-50/50 text-emerald-600"
                lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.ironMan}
                title="Iron Man"
                description="Play 3+ matches in 1 day"
                icon="🚀"
                glowClass="shadow-purple-500/10 border-purple-200 bg-purple-50/50 text-purple-600"
                lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
              />
              <AchievementBadge
                unlocked={achievements.dynamicDuo}
                title="Dynamic Duo"
                description="3+ doubles streak"
                icon="🤝"
                glowClass="shadow-amber-500/10 border-amber-200 bg-amber-50/50 text-amber-600"
                lockedClass="border-slate-100 bg-slate-50 text-slate-400 opacity-40"
              />
            </div>
          </section>

          {/* Recent Match Log */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Recent Matches</h2>
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
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No matches recorded yet.
              </p>
            )}
          </section>
        </div>
      ) : (
        /* Private Profile Notice */
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50 mt-6 space-y-3">
          <Shield size={36} className="text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Stats are private</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
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
      <span className="text-[9px] leading-tight text-slate-500">{description}</span>
    </div>
  )
}
