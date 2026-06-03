import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { Button } from './ui/button'
import type { MatchWithDetails } from '../types'

interface MatchScoreboardProps {
  match: MatchWithDetails & { clubName?: string }
  onShare?: (match: any) => void
  showClubName?: boolean
  isAdmin?: boolean
  onEdit?: (match: any) => void
  onDelete?: (matchId: string) => void
}

export function MatchScoreboard({
  match,
  onShare,
  showClubName = true,
  isAdmin = false,
  onEdit,
  onDelete,
}: MatchScoreboardProps) {
  const scoreSets = match.score_sets || []
  const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
  const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
  const winner = team1Sets > team2Sets ? 1 : team2Sets > team1Sets ? 2 : 0

  const team1 = match.participants.filter((p) => p.team === 1)
  const team2 = match.participants.filter((p) => p.team === 2)

  return (
    <div
      className={`relative rounded-xl border bg-[#0b1322] border-slate-800 overflow-hidden shadow-lg transition duration-200 hover:border-slate-700 ${
        winner === 1 ? 'border-l-4 border-l-[#f97316]' : winner === 2 ? 'border-l-4 border-l-[#22c55e]' : ''
      }`}
    >
      {/* Top Bar: Title, Meta, and Action Buttons */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#070b13] border-b border-slate-800/60">
        <div className="min-w-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block truncate">
            {match.title || `${match.sport} Match`}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block truncate">
            {match.sport} • {match.match_type} • {showClubName && match.clubName ? `${match.clubName} • ` : ''}
            {new Date(match.match_date).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onShare && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onShare(match)}
              title="Share Scorecard"
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <Share2 size={13} aria-hidden="true" />
            </Button>
          )}
          {isAdmin && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(match)}
              title="Edit score"
              className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <span className="text-xs">✏️</span>
            </button>
          )}
          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(match.id)}
              title="Delete score"
              className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-950/45 rounded-lg transition"
            >
              <span className="text-xs">🗑️</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scoreboard Area (Two rows, with name & set boxes) */}
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left Panel: Teams */}
        <div className="space-y-3.5 flex-1 min-w-0">
          {/* Row Team 1 */}
          <div className="flex items-center gap-2">
            {winner === 1 && (
              <span className="text-amber-400 font-bold shrink-0 animate-pulse" title="Winner">
                👑
              </span>
            )}
            <div
              className={`truncate text-sm md:text-base font-extrabold uppercase tracking-wide flex flex-wrap items-center gap-1.5 ${
                winner === 1 ? 'text-[#f97316]' : 'text-orange-500/70'
              }`}
            >
              {team1.map((p, pIdx) => {
                const pName = p.name || p.guest_name || 'Guest'
                return (
                  <span key={pIdx} className="flex items-center">
                    {p.user_id ? (
                      <Link to={`/member/${p.user_id}`} className="hover:underline">
                        {pName}
                      </Link>
                    ) : (
                      <span>{pName}</span>
                    )}
                    {pIdx < team1.length - 1 && <span className="mx-1 text-slate-600 font-normal">&</span>}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Row Team 2 */}
          <div className="flex items-center gap-2">
            {winner === 2 && (
              <span className="text-amber-400 font-bold shrink-0 animate-pulse" title="Winner">
                👑
              </span>
            )}
            <div
              className={`truncate text-sm md:text-base font-extrabold uppercase tracking-wide flex flex-wrap items-center gap-1.5 ${
                winner === 2 ? 'text-[#22c55e]' : 'text-emerald-500/70'
              }`}
            >
              {team2.map((p, pIdx) => {
                const pName = p.name || p.guest_name || 'Guest'
                return (
                  <span key={pIdx} className="flex items-center">
                    {p.user_id ? (
                      <Link to={`/member/${p.user_id}`} className="hover:underline">
                        {pName}
                      </Link>
                    ) : (
                      <span>{pName}</span>
                    )}
                    {pIdx < team2.length - 1 && <span className="mx-1 text-slate-600 font-normal">&</span>}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Sets Grid Boxes */}
        <div className="flex items-center gap-1.5 shrink-0">
          {scoreSets.map((set, setIdx) => {
            const t1Won = set.team1_score > set.team2_score
            const t2Won = set.team2_score > set.team1_score

            return (
              <div key={setIdx} className="flex flex-col gap-1 text-center">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  SET {set.set_number || setIdx + 1}
                </span>

                {/* Team 1 Box */}
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center font-mono font-black text-lg border transition ${
                    t1Won
                      ? 'bg-[#f97316] border-[#f97316] text-[#090f17] shadow-sm shadow-orange-500/25'
                      : 'bg-[#121c2c] border-orange-500/20 text-[#f97316]/50'
                  }`}
                >
                  {set.team1_score}
                </div>

                {/* Team 2 Box */}
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center font-mono font-black text-lg border transition ${
                    t2Won
                      ? 'bg-[#22c55e] border-[#22c55e] text-[#090f17] shadow-sm shadow-emerald-500/25'
                      : 'bg-[#121c2c] border-emerald-500/20 text-[#22c55e]/50'
                  }`}
                >
                  {set.team2_score}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
