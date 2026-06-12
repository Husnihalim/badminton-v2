import { useState, useMemo } from 'react'
import { Share2, Users } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'
import type { MatchWithDetails, User } from '../../../types'

type DashboardMatch = MatchWithDetails & { clubName?: string }

interface RivalryToolProps {
  user: User
  clubMembers: { id?: string; name: string }[]
  allUserMatches: DashboardMatch[]
  selectedRival: string
  onSelectedRivalChange: (rival: string) => void
  onShareRivalry: (data: {
    rivalName: string
    wins: number
    losses: number
    matchesPlayed: number
    mode: 'rival' | 'partner'
  }) => void
}

export default function RivalryTool({
  user,
  clubMembers,
  allUserMatches,
  selectedRival,
  onSelectedRivalChange,
  onShareRivalry,
}: RivalryToolProps) {
  const [comparisonMode, setComparisonMode] = useState<'rival' | 'partner'>('partner')

  const rivalryStats = useMemo(() => {
    if (!selectedRival || !user) return null

    const targetMatches = allUserMatches.filter((m) => {
      const userPart = m.participants.find((p) => p.user_id === user.id)
      if (!userPart) return false

      const otherPart = m.participants.find(
        (p) =>
          (p.user_id && p.user_id === selectedRival) ||
          (p.name && p.name.toLowerCase() === selectedRival.toLowerCase()) ||
          (p.guest_name && p.guest_name.toLowerCase() === selectedRival.toLowerCase())
      )
      if (!otherPart) return false

      if (comparisonMode === 'rival') {
        return userPart.team !== otherPart.team
      } else {
        return m.match_type === 'doubles' && userPart.team === otherPart.team
      }
    })

    targetMatches.sort(
      (a, b) =>
        new Date(b.match_date || b.created_at).getTime() -
        new Date(a.match_date || a.created_at).getTime()
    )

    let wins = 0
    let losses = 0
    const form: ('W' | 'L')[] = []
    let activeStreak = 0
    let streakType: 'win' | 'loss' | null = null
    let isStreakBroken = false

    targetMatches.forEach((m, idx) => {
      const userPart = m.participants.find((p) => p.user_id === user.id)
      if (!userPart) return

      const scoreSets = m.score_sets || []
      if (scoreSets.length === 0) return

      const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
      const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
      if (team1Sets === team2Sets) return

      const winningTeam = team1Sets > team2Sets ? 1 : 2
      const isWin = userPart.team === winningTeam

      if (isWin) {
        wins++
        if (idx < 5) form.push('W')
      } else {
        losses++
        if (idx < 5) form.push('L')
      }

      if (!isStreakBroken) {
        if (streakType === null) {
          streakType = isWin ? 'win' : 'loss'
          activeStreak = 1
        } else if (streakType === 'win' && isWin) {
          activeStreak++
        } else if (streakType === 'loss' && !isWin) {
          activeStreak++
        } else {
          isStreakBroken = true
        }
      }
    })

    return {
      matchesPlayed: targetMatches.length,
      wins,
      losses,
      winRate:
        targetMatches.length > 0 ? Math.round((wins / targetMatches.length) * 100) : 0,
      form: form.reverse(),
      streak: streakType === null ? 0 : activeStreak,
      streakType,
    }
  }, [selectedRival, allUserMatches, user, comparisonMode])

  const recommendedInsights = useMemo(() => {
    if (!user || allUserMatches.length === 0) return null

    const partners = new Map<string, { wins: number; matches: number }>()
    const rivals = new Map<string, { wins: number; matches: number }>()
    const opponentPairs = new Map<string, { wins: number; losses: number; matches: number }>()

    allUserMatches.forEach((m) => {
      const userPart = m.participants.find((p) => p.user_id === user.id)
      if (!userPart) return

      const scoreSets = m.score_sets || []
      if (scoreSets.length === 0) return

      const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
      const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
      if (team1Sets === team2Sets) return

      const winningTeam = team1Sets > team2Sets ? 1 : 2
      const isWin = userPart.team === winningTeam

      m.participants.forEach((p) => {
        const pName = p.name || p.guest_name
        if (!pName) return

        // Exclude the user themselves from being recommended as teammate/rival
        if (p.user_id === user.id) return
        if (pName.toLowerCase() === user.name.toLowerCase()) return
        if (
          user.display_name &&
          pName.toLowerCase() === user.display_name.toLowerCase()
        )
          return

        if (userPart.team === p.team) {
          // Teammate (Partner) in doubles
          if (m.match_type === 'doubles') {
            const stats = partners.get(pName) ?? { wins: 0, matches: 0 }
            stats.matches++
            if (isWin) stats.wins++
            partners.set(pName, stats)
          }
        } else {
          // Opponent (Rival)
          const stats = rivals.get(pName) ?? { wins: 0, matches: 0 }
          stats.matches++
          if (isWin) stats.wins++ // User won against this opponent
          rivals.set(pName, stats)
        }
      })

      // Calculate opponent pairs in doubles matches
      if (m.match_type === 'doubles') {
        const oppNames = m.participants
          .filter((p) => p.team !== userPart.team)
          .map((p) => p.name || p.guest_name)
          .filter(Boolean) as string[]

        if (oppNames.length === 2) {
          oppNames.sort()
          const pairKey = oppNames.join(' & ')
          const stats =
            opponentPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
          stats.matches++
          if (isWin) {
            stats.wins++
          } else {
            stats.losses++
          }
          opponentPairs.set(pairKey, stats)
        }
      }
    })

    // Find best partner: highest win rate (min 2 matches if possible, otherwise 1)
    const partnersListCorrect = Array.from(partners.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      winRate: (stats.wins / stats.matches) * 100,
    }))

    let bestPartner = null
    const partnerCandidates = partnersListCorrect.filter((p) => p.matches >= 2)
    const targetPartners =
      partnerCandidates.length > 0 ? partnerCandidates : partnersListCorrect
    if (targetPartners.length > 0) {
      bestPartner = [...targetPartners].sort(
        (a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches
      )[0]
    }

    // Find biggest rival: most matches played against
    const rivalsList = Array.from(rivals.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      winRate: (stats.wins / stats.matches) * 100,
    }))

    let topRival = null
    const rivalCandidates = rivalsList.filter((r) => r.matches >= 2)
    const targetRivals = rivalCandidates.length > 0 ? rivalCandidates : rivalsList
    if (targetRivals.length > 0) {
      topRival = [...targetRivals].sort(
        (a, b) =>
          b.matches - a.matches ||
          Math.abs(50 - a.winRate) - Math.abs(50 - b.winRate)
      )[0]
    }

    // Find nemesis (worst opponent): lowest win rate and must have at least 1 loss
    let nemesis = null
    const nemesisList = rivalsList.filter((r) => r.matches - r.wins > 0)
    if (nemesisList.length > 0) {
      const nemesisCandidates = nemesisList.filter((r) => r.matches >= 2)
      const targetNemesis =
        nemesisCandidates.length > 0 ? nemesisCandidates : nemesisList
      nemesis = [...targetNemesis].sort(
        (a, b) =>
          a.winRate - b.winRate ||
          b.matches - a.matches ||
          b.matches - b.wins - (a.matches - a.wins)
      )[0]
    }

    // Find toughest opponent pairs (lost to them)
    const opponentPairsList = Array.from(opponentPairs.entries()).map(([names, stats]) => ({
      names,
      ...stats,
      winRate: (stats.wins / stats.matches) * 100,
    }))

    const worstOpponentPairs = opponentPairsList
      .filter((p) => p.losses > 0)
      .sort((a, b) => b.losses - a.losses || a.winRate - b.winRate || b.matches - a.matches)
      .slice(0, 3)

    return {
      bestPartner,
      topRival,
      nemesis,
      worstOpponentPairs,
      bestPartnersList: partnersListCorrect
        .filter((p) => p.matches >= 1)
        .sort(
          (a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches
        )
        .slice(0, 3),
      topRivalsList: rivalsList
        .filter((r) => r.matches >= 1)
        .sort((a, b) => b.matches - a.matches || a.winRate - b.winRate)
        .slice(0, 3),
    }
  }, [allUserMatches, user])

  return (
    <section className="app-section space-y-4">
      <div className="app-section-header">
        <h2 className="app-section-title">
          <Users size={18} className="text-[var(--arena-accent)] shrink-0" />
          {comparisonMode === 'partner'
            ? 'Doubles Partnership Checker'
            : 'Head-to-Head Rivalry Checker'}
        </h2>
        <p className="app-section-subtitle">
          {comparisonMode === 'partner'
            ? 'Select a club member to analyze your performance playing together on the same team.'
            : 'Select a club member to analyze your head-to-head match history.'}
        </p>
      </div>

      {/* Mode Switcher Toggle and Recommendations */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-1 w-full max-w-xs shadow-sm">
          <button
            type="button"
            className={`min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition ${
              comparisonMode === 'partner'
                ? 'bg-surface text-[var(--arena-accent)] shadow-sm border border-[var(--arena-border)]/40'
                : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)] font-bold'
            }`}
            onClick={() => {
              setComparisonMode('partner')
              onSelectedRivalChange('')
            }}
          >
            🤝 Partner Stats
          </button>
          <button
            type="button"
            className={`min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition ${
              comparisonMode === 'rival'
                ? 'bg-surface text-[var(--arena-accent)] shadow-sm border border-[var(--arena-border)]/40'
                : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)] font-bold'
            }`}
            onClick={() => {
              setComparisonMode('rival')
              onSelectedRivalChange('')
            }}
          >
            ⚔️ Rival Stats
          </button>
        </div>

        {/* Quick Recommendations */}
        {recommendedInsights &&
          (recommendedInsights.bestPartner ||
            recommendedInsights.topRival ||
            recommendedInsights.nemesis) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[var(--arena-text-dim)]">
                Quick recommendations:
              </span>
              {recommendedInsights.bestPartner && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode('partner')
                    onSelectedRivalChange(recommendedInsights.bestPartner!.name)
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none cursor-pointer ${
                    comparisonMode === 'partner' &&
                    selectedRival === recommendedInsights.bestPartner.name
                      ? 'bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-surface text-[var(--arena-text-muted)] border-slate-250 hover:bg-[var(--arena-surface-muted)] hover:text-[var(--arena-text)]'
                  }`}
                  title={`Recommended Teammate: ${recommendedInsights.bestPartner.name}`}
                >
                  🤝 Teammate: {recommendedInsights.bestPartner.name}
                </button>
              )}
              {recommendedInsights.topRival && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode('rival')
                    onSelectedRivalChange(recommendedInsights.topRival!.name)
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none cursor-pointer ${
                    comparisonMode === 'rival' &&
                    selectedRival === recommendedInsights.topRival.name
                      ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-500/10'
                      : 'bg-surface text-[var(--arena-text-muted)] border-slate-250 hover:bg-[var(--arena-surface-muted)] hover:text-slate-955'
                  }`}
                  title={`Recommended Opponent: ${recommendedInsights.topRival.name}`}
                >
                  ⚔️ Opponent: {recommendedInsights.topRival.name}
                </button>
              )}
              {recommendedInsights.nemesis &&
                (!recommendedInsights.topRival ||
                  recommendedInsights.nemesis.name !== recommendedInsights.topRival.name) && (
                  <button
                    type="button"
                    onClick={() => {
                      setComparisonMode('rival')
                      onSelectedRivalChange(recommendedInsights.nemesis!.name)
                    }}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none cursor-pointer ${
                      comparisonMode === 'rival' &&
                      selectedRival === recommendedInsights.nemesis.name
                        ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/10'
                        : 'bg-surface text-[var(--arena-text-muted)] border-slate-250 hover:bg-[var(--arena-surface-muted)] hover:text-slate-955'
                    }`}
                    title={`Nemesis (Worst Opponent): ${
                      recommendedInsights.nemesis.name
                    } (${Math.round(recommendedInsights.nemesis.winRate)}% Win Rate)`}
                  >
                    ⚔️ Nemesis: {recommendedInsights.nemesis.name}
                  </button>
                )}
            </div>
          )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full sm:max-w-xs space-y-2">
          <label
            htmlFor="rival-select"
            className="text-xs font-semibold text-[var(--arena-text-dim)]"
          >
            {comparisonMode === 'partner' ? 'Choose Partner' : 'Choose Rival'}
          </label>
          <select
            id="rival-select"
            value={selectedRival}
            onChange={(e) => onSelectedRivalChange(e.target.value)}
            className="w-full p-2.5 bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] rounded-lg text-sm text-[var(--arena-text)] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            <option value="">-- Select Member --</option>
            {clubMembers.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {selectedRival && rivalryStats ? (
          <div className="flex-1 space-y-4">
            {rivalryStats.matchesPlayed > 0 ? (
              <div className="rounded-lg border border-slate-100 bg-[var(--arena-surface-muted)] p-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--arena-text)]">
                      {comparisonMode === 'partner'
                        ? `You & ${selectedRival}`
                        : `You vs ${selectedRival}`}
                    </h3>
                    <p className="text-xs text-[var(--arena-text-dim)]">
                      {comparisonMode === 'partner'
                        ? 'Your doubles performance when playing together on the same team.'
                        : 'Competitive match record playing on opposite teams.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      onShareRivalry({
                        rivalName: selectedRival,
                        wins: rivalryStats.wins,
                        losses: rivalryStats.losses,
                        matchesPlayed: rivalryStats.matchesPlayed,
                        mode: comparisonMode,
                      })
                    }
                    className="gap-1.5 self-start bg-emerald-750 hover:bg-emerald-850 text-white font-semibold"
                  >
                    <Share2 size={14} />
                    Share {comparisonMode === 'partner' ? 'Partnership' : 'Rivalry'} Card
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-[var(--arena-surface)] border border-[var(--arena-border)] rounded-lg">
                    <span className="text-xs text-[var(--arena-text-dim)] block">
                      Matches
                    </span>
                    <span className="text-lg font-extrabold text-[var(--arena-text)]">
                      {rivalryStats.matchesPlayed}
                    </span>
                  </div>
                  <div className="p-3 bg-[var(--arena-accent-soft)]/50 border border-emerald-100 rounded-lg">
                    <span className="text-xs text-[var(--arena-accent)] block">
                      {comparisonMode === 'partner' ? 'Wins Together' : 'Your Wins'}
                    </span>
                    <span className="text-lg font-extrabold text-[var(--arena-accent)]">
                      {rivalryStats.wins}
                    </span>
                  </div>
                  <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg">
                    <span className="text-xs text-red-400 block">
                      {comparisonMode === 'partner' ? 'Losses Together' : 'Their Wins'}
                    </span>
                    <span className="text-lg font-extrabold text-red-400">
                      {rivalryStats.losses}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--arena-text-dim)] font-medium">
                      {comparisonMode === 'partner' ? 'Win Rate:' : 'Head-to-Head Streak:'}
                    </span>
                    {comparisonMode === 'partner' ? (
                      <span className="text-[var(--arena-accent)] font-bold">
                        {rivalryStats.winRate}%
                      </span>
                    ) : rivalryStats.streakType === 'win' ? (
                      <span className="text-[var(--arena-accent)] font-bold">
                        🔥 {rivalryStats.streak} Win
                      </span>
                    ) : rivalryStats.streakType === 'loss' ? (
                      <span className="text-red-400 font-bold">
                        -{rivalryStats.streak} Loss
                      </span>
                    ) : (
                      <span className="text-[var(--arena-text-dim)]">0</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--arena-text-dim)] font-medium mr-1">
                      {comparisonMode === 'partner'
                        ? 'Partnership Form:'
                        : 'Rivalry Form:'}
                    </span>
                    {rivalryStats.form.map((outcome, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold text-white',
                          outcome === 'W' ? 'bg-[var(--arena-accent)]' : 'bg-red-500'
                        )}
                      >
                        {outcome}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
                {comparisonMode === 'partner'
                  ? `You haven't played any doubles matches together with ${selectedRival} yet.`
                  : `You haven't played any matches against ${selectedRival} yet.`}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            <div className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/40 p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="font-bold text-[var(--arena-text)] text-base">
                  Your Partnership & Rivalry Insights
                </h3>
                <p className="text-xs text-[var(--arena-text-dim)] mt-0.5">
                  Personalized recommendations and analysis based on your matches. Click any
                  player's badge above or select from the dropdown to view details.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Top Partners */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)] flex items-center gap-1.5">
                    <span>🤝</span> Best Partners
                  </h4>
                  {recommendedInsights?.bestPartnersList &&
                  recommendedInsights.bestPartnersList.length > 0 ? (
                    <div className="space-y-1.5">
                      {recommendedInsights.bestPartnersList.map((p, idx) => (
                        <div
                          key={p.name}
                          onClick={() => {
                            setComparisonMode('partner')
                            onSelectedRivalChange(p.name)
                          }}
                          className="flex items-center justify-between p-2.5 bg-surface border border-slate-150 rounded-lg hover:border-emerald-500 hover:shadow-sm cursor-pointer transition select-none"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--arena-text-dim)] font-mono">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-semibold text-[var(--arena-text)] truncate">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--arena-text-dim)] font-medium">
                              {p.matches} matches
                            </span>
                            <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] rounded border border-emerald-100">
                              {Math.round(p.winRate)}% Win
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--arena-text-dim)] italic p-3 border border-dashed border-[var(--arena-border)] rounded-lg bg-surface">
                      Play doubles matches to see recommended partners.
                    </p>
                  )}
                </div>

                {/* Top Rivals */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)] flex items-center gap-1.5">
                    <span>⚔️</span> Top Rivals
                  </h4>
                  {recommendedInsights?.topRivalsList &&
                  recommendedInsights.topRivalsList.length > 0 ? (
                    <div className="space-y-1.5">
                      {recommendedInsights.topRivalsList.map((r, idx) => {
                        const isNemesis =
                          recommendedInsights.nemesis &&
                          recommendedInsights.nemesis.name === r.name
                        return (
                          <div
                            key={r.name}
                            onClick={() => {
                              setComparisonMode('rival')
                              onSelectedRivalChange(r.name)
                            }}
                            className={`flex items-center justify-between p-2.5 bg-surface border rounded-lg hover:shadow-sm cursor-pointer transition select-none ${
                              isNemesis
                                ? 'border-rose-200 hover:border-rose-500'
                                : 'border-slate-150 hover:border-emerald-500'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--arena-text-dim)] font-mono">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-semibold text-[var(--arena-text)] truncate">
                                {r.name}
                              </span>
                              {isNemesis && (
                                <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.2 bg-rose-50 text-rose-600 rounded border border-rose-100">
                                  Nemesis
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--arena-text-dim)] font-medium">
                                {r.matches} matches
                              </span>
                              <span
                                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${
                                  r.winRate < 50
                                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                                    : 'bg-[var(--arena-surface-muted)] text-[var(--arena-text-muted)] border-slate-250'
                                }`}
                              >
                                {Math.round(r.winRate)}% Win
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--arena-text-dim)] italic p-3 border border-dashed border-[var(--arena-border)] rounded-lg bg-surface">
                      Play matches to see rivalry analysis.
                    </p>
                  )}
                </div>
              </div>

              {/* Toughest Opponent Pairs Section (Lost a lot to some pairs) */}
              <div className="space-y-2.5 border-t border-[var(--arena-border)]/60 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)] flex items-center gap-1.5">
                  <span>🔥</span> Toughest Opponent Pairs (Doubles)
                </h4>
                {recommendedInsights?.worstOpponentPairs &&
                recommendedInsights.worstOpponentPairs.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {recommendedInsights.worstOpponentPairs.map((pair, idx) => (
                      <div
                        key={pair.names}
                        className="flex flex-col justify-between p-3 bg-surface border border-rose-100 hover:border-rose-300 hover:shadow-sm rounded-lg transition"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-rose-500 font-mono">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[var(--arena-text-dim)] uppercase tracking-wide">
                              Nemesis Pair
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold text-[var(--arena-text)] leading-tight line-clamp-2"
                            title={pair.names}
                          >
                            {pair.names}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-xs">
                          <span className="text-[var(--arena-text-dim)] font-medium">
                            {pair.matches} played
                          </span>
                          <span className="font-extrabold text-rose-600">
                            {pair.losses} {pair.losses === 1 ? 'loss' : 'losses'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--arena-text-dim)] italic p-3 border border-dashed border-[var(--arena-border)] rounded-lg bg-surface">
                    No doubles losses recorded against specific opponent pairs yet. Keep
                    playing to track nemesis pairs!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
