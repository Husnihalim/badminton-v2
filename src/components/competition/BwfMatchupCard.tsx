import { useState } from 'react'
import { Award, ChevronDown, ChevronUp, Swords } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { CompetitionMatchup, CompetitionParticipant } from '../../types/competition'
import { cn } from '../../lib/utils'

interface BwfMatchupCardProps {
  matchup: CompetitionMatchup
  isAdmin: boolean
  onRecordScore?: (matchup: CompetitionMatchup) => void
}

export default function BwfMatchupCard({
  matchup,
  isAdmin,
  onRecordScore
}: BwfMatchupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isCompleted = matchup.status === 'completed'
  const isLive = matchup.status === 'live'
  const scoreSets = matchup.match?.score_sets || []

  // Helper to check if a set was won by team 1 or team 2
  const getSetWinner = (set: { team1_score: number; team2_score: number }) => {
    if (set.team1_score > set.team2_score) return 1
    if (set.team2_score > set.team1_score) return 2
    return 0
  }

  const isWinnerA = matchup.winner_participant_id === matchup.participant_a_id
  const isWinnerB = matchup.winner_participant_id === matchup.participant_b_id

  const renderAvatars = (part?: CompetitionParticipant) => {
    if (!part) return null
    const p1 = part.player_1
    const p2 = part.player_2

    if (p2) {
      // Doubles overlap avatars
      return (
        <div className="relative flex items-center h-10 w-12 shrink-0">
          <div className="absolute left-0 bottom-0 h-7 w-7 rounded-full bg-slate-900 border border-white/20 overflow-hidden shadow-md">
            {p1?.avatar_url ? (
              <img src={p1.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[9px] font-black text-[var(--arena-lime)]">
                {p1?.display_name?.charAt(0) || p1?.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div className="absolute right-0 top-0 h-7 w-7 rounded-full bg-slate-950 border border-white/20 overflow-hidden shadow-md">
            {p2?.avatar_url ? (
              <img src={p2.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[9px] font-black text-[var(--arena-lime)]">
                {p2?.display_name?.charAt(0) || p2?.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
        </div>
      )
    }

    // Singles avatar
    return (
      <div className="h-9 w-9 rounded-full bg-slate-900 border border-white/20 overflow-hidden shadow-md flex items-center justify-center shrink-0">
        {p1?.avatar_url ? (
          <img src={p1.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-[var(--arena-lime)]">
            {p1?.display_name?.charAt(0) || p1?.name?.charAt(0) || part.name?.charAt(0) || '?'}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card 
      className={cn(
        "border border-white/10 bg-[#0a0f0e] shadow-[var(--arena-glow)] overflow-hidden transition-all duration-300",
        isLive && "border-[var(--arena-lime)]/30 ring-1 ring-[var(--arena-lime)]/20 shadow-[0_0_15px_rgba(204,255,0,0.06)]"
      )}
    >
      <CardContent className="p-0">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-slate-950/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[var(--arena-blue)]">Court {matchup.order_index + 1}</span>
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {isCompleted ? (
              <Badge variant="blue" className="bg-slate-900 text-slate-300 border-white/10">Completed</Badge>
            ) : isLive ? (
              <Badge variant="live" className="animate-pulse">Live</Badge>
            ) : (
              <Badge variant="muted">Scheduled</Badge>
            )}
          </div>
        </div>

        {/* Players & Scores Grid */}
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-4">
            {/* Player A Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {renderAvatars(matchup.participant_a)}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={cn(
                        "font-extrabold text-sm md:text-base leading-snug truncate",
                        isCompleted ? (isWinnerA ? "text-[var(--arena-lime)]" : "text-slate-400") : "text-white"
                      )}
                    >
                      {matchup.participant_a?.name || "TBD Player A"}
                    </span>
                    {isWinnerA && <Award size={14} className="text-[var(--arena-lime)] shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {matchup.participant_a?.player_1?.display_name ? "Club Player" : "Guest"}
                  </span>
                </div>
              </div>

              {/* Set Scores for Player A */}
              {isCompleted && scoreSets.length > 0 && (
                <div className="flex gap-1 bg-black/20 p-1 rounded border border-white/5 shrink-0">
                  {scoreSets.map((set, sIdx) => {
                    const isSetWinner = getSetWinner(set) === 1
                    return (
                      <div 
                        key={sIdx} 
                        className={cn(
                          "w-8 py-1 rounded text-center text-xs font-mono font-bold border border-transparent",
                          isSetWinner ? "bg-[var(--arena-accent-soft)] text-[var(--arena-lime)] border-[var(--arena-lime)]/20" : "text-slate-500 bg-slate-900/40"
                        )}
                      >
                        {set.team1_score}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Player B Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {renderAvatars(matchup.participant_b)}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={cn(
                        "font-extrabold text-sm md:text-base leading-snug truncate",
                        isCompleted ? (isWinnerB ? "text-[var(--arena-lime)]" : "text-slate-400") : "text-white"
                      )}
                    >
                      {matchup.participant_b?.name || "TBD Player B"}
                    </span>
                    {isWinnerB && <Award size={14} className="text-[var(--arena-lime)] shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {matchup.participant_b?.player_1?.display_name ? "Club Player" : "Guest"}
                  </span>
                </div>
              </div>

              {/* Set Scores for Player B */}
              {isCompleted && scoreSets.length > 0 && (
                <div className="flex gap-1 bg-black/20 p-1 rounded border border-white/5 shrink-0">
                  {scoreSets.map((set, sIdx) => {
                    const isSetWinner = getSetWinner(set) === 2
                    return (
                      <div 
                        key={sIdx} 
                        className={cn(
                          "w-8 py-1 rounded text-center text-xs font-mono font-bold border border-transparent",
                          isSetWinner ? "bg-[var(--arena-accent-soft)] text-[var(--arena-lime)] border-[var(--arena-lime)]/20" : "text-slate-500 bg-slate-900/40"
                        )}
                      >
                        {set.team2_score}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-2 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 shrink-0">
            {(!isCompleted && isAdmin && onRecordScore) && (
              <Button
                onClick={() => onRecordScore(matchup)}
                size="sm"
                className="w-full md:w-auto bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 font-bold uppercase tracking-wider text-xs gap-1 py-1.5 px-3 cursor-pointer rounded-lg"
              >
                <Swords size={13} />
                Record Score
              </Button>
            )}

            {scoreSets.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer ml-auto md:ml-0"
              >
                {isExpanded ? (
                  <>
                    <span>Hide Details</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Game Stats</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Detailed Point Progression / Expanded View */}
        {isExpanded && scoreSets.length > 0 && (
          <div className="bg-slate-950/60 border-t border-white/5 px-4 py-3 text-xs space-y-2.5">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Set Details</h4>
            <div className="grid gap-2">
              {scoreSets.map((set, idx) => {
                const isDecider = scoreSets.length === 3 && idx === 2
                return (
                  <div key={idx} className="flex items-center justify-between bg-[#0a0f0e]/50 border border-white/5 p-2 rounded">
                    <span className="font-semibold text-slate-400">
                      Game {idx + 1} {isDecider && <span className="text-[var(--arena-lime)] font-black text-[9px] ml-1 tracking-widest uppercase">Decider</span>}
                    </span>
                    <div className="flex items-center gap-3 font-mono font-bold text-sm">
                      <span className={cn(set.team1_score > set.team2_score ? "text-[var(--arena-lime)]" : "text-slate-500")}>
                        {set.team1_score}
                      </span>
                      <span className="text-slate-600 font-normal text-xs">vs</span>
                      <span className={cn(set.team2_score > set.team1_score ? "text-[var(--arena-lime)]" : "text-slate-500")}>
                        {set.team2_score}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
