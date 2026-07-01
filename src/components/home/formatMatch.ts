/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MatchWithDetails } from '../../types'

export interface TickerItem {
  id: string
  summary: string
  clubName: string
  scoredAt: string
  storyChips: string[]
}

function teamNames(match: MatchWithDetails, team: 1 | 2): string[] {
  return (match.participants ?? [])
    .filter((p) => p.team === team)
    .map((p) => p.name || p.guest_name || 'Guest')
}

function formatScores(match: MatchWithDetails): string {
  const sets = [...(match.score_sets ?? [])].sort((a, b) => a.set_number - b.set_number)
  return sets.map((s) => `${s.team1_score}-${s.team2_score}`).join(', ')
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

function winnerTeam(match: MatchWithDetails): 1 | 2 | null {
  const sets = [...(match.score_sets ?? [])]
  if (sets.length === 0) return null
  let t1 = 0
  let t2 = 0
  for (const s of sets) {
    if (s.team1_score > s.team2_score) t1++
    else if (s.team2_score > s.team1_score) t2++
  }
  if (t1 === t2 && sets.length === 3) {
    const decider = sets.find((s) => s.set_number === 3)
    if (decider) return decider.team1_score > decider.team2_score ? 1 : 2
  }
  return t1 > t2 ? 1 : t2 > t1 ? 2 : null
}

export function buildTickerItems(clubMatches: Record<string, any[]>): TickerItem[] {
  const flat: Array<{ match: any; clubName: string }> = []
  for (const [clubId, matches] of Object.entries(clubMatches)) {
    const clubName = matches[0]?.clubName || clubId
    for (const m of matches) {
      if (m.status !== 'completed') continue
      flat.push({ match: m, clubName })
    }
  }
  flat.sort((a, b) => {
    const ta = new Date(a.match.match_date || a.match.created_at).getTime()
    const tb = new Date(b.match.match_date || b.match.created_at).getTime()
    return tb - ta
  })
  return flat.slice(0, 12).map(({ match, clubName }) => {
    const win = winnerTeam(match)
    const t1 = teamNames(match, 1)
    const t2 = teamNames(match, 2)
    const head = (which: 1 | 2) => (which === win ? `def.` : 'lost to')
    const summary = win
      ? `${t1.join(' & ')} ${head(1)} ${t2.join(' & ')} — ${formatScores(match)}`
      : `${t1.join(' & ')} vs ${t2.join(' & ')} — ${formatScores(match)}`
    return {
      id: match.id,
      summary,
      clubName,
      scoredAt: timeAgo(match.match_date || match.created_at),
      storyChips: [],
    }
  })
}

export function formatTimeAgo(iso: string): string {
  return timeAgo(iso)
}