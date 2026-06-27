import { useState, useMemo } from 'react'
import { Swords, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { useNotifications } from '../../context/NotificationsContext'

import type { CompetitionMatchup, CompetitionParticipant } from '../../types/competition'
import { cn } from '../../lib/utils'

interface PlayoffBracketProps {
  competitionId: string
  matchups: CompetitionMatchup[]
  participants: CompetitionParticipant[]
  isAdmin: boolean
  onRecordScore?: (matchup: CompetitionMatchup) => void
  onRefresh?: () => void
}

export default function PlayoffBracket({
  matchups,
  participants,
  isAdmin,
  onRecordScore
}: PlayoffBracketProps) {
  const { showToast } = useNotifications()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Seeding configuration states
  const [bracketSize, setBracketSize] = useState<2 | 4 | 8>(4)
  const [pairings, setPairings] = useState<Array<{ aId: string; bId: string }>>([
    { aId: '', bId: '' },
    { aId: '', bId: '' }
  ])

  // Extract playoff matchups
  const playoffMatchups = useMemo(() => {
    return matchups.filter(m => m.bracket_round !== null && m.bracket_round !== undefined)
  }, [matchups])

  // Group playoff matchups by round
  const rounds = useMemo(() => {
    const grouped: Record<number, CompetitionMatchup[]> = {}
    playoffMatchups.forEach(m => {
      const r = m.bracket_round || 0
      if (!grouped[r]) grouped[r] = []
      grouped[r].push(m)
    })
    
    // Sort each round matches by position
    Object.keys(grouped).forEach(r => {
      grouped[Number(r)].sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
    })
    
    return grouped
  }, [playoffMatchups])

  const maxRound = useMemo(() => {
    const roundsList = Object.keys(rounds).map(Number)
    return roundsList.length > 0 ? Math.max(...roundsList) : 0
  }, [rounds])

  // Get round name helper
  const getRoundName = (roundNum: number, totalRounds: number) => {
    const diff = totalRounds - roundNum
    if (diff === 0) return 'Finals'
    if (diff === 1) return 'Semifinals'
    if (diff === 2) return 'Quarterfinals'
    return `Round of ${Math.pow(2, diff + 1)}`
  }

  // Handle bracket size change
  const handleSizeChange = (size: 2 | 4 | 8) => {
    setBracketSize(size)
    const newCount = size
    const newPairings = Array.from({ length: newCount }, () => ({ aId: '', bId: '' }))
    
    // Try to auto-seed based on rankings/seeds if participants are loaded
    const sortedParts = [...participants].sort((a, b) => (a.seed || 999) - (b.seed || 999))
    for (let i = 0; i < newCount; i++) {
      if (sortedParts[i]) newPairings[i].aId = sortedParts[i].id
      if (sortedParts[2 * newCount - 1 - i]) newPairings[i].bId = sortedParts[2 * newCount - 1 - i].id
    }
    setPairings(newPairings)
  }

  // Handle dropdown selection change
  const handlePairingChange = (idx: number, side: 'aId' | 'bId', value: string) => {
    setPairings(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [side]: value }
      return updated
    })
  }

  // Trigger bracket generation
  const handleCreateBracket = async () => {
    // Validate that all pairings have selections
    const invalid = pairings.some(p => !p.aId || !p.bId)
    if (invalid) {
      showToast('Please select participants for all bracket slots', 'error')
      return
    }

    setIsSubmitting(true)
    showToast('Playoff brackets are not available in the current version', 'error')
    setIsSubmitting(false)
  }

  // Bracket Seeding Form (visible to admin when matchups are empty)
  if (playoffMatchups.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-white/10 bg-[#0a0f0e] shadow-[var(--arena-glow)]">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-[var(--arena-lime)] uppercase tracking-wider mb-1">
                Playoff Bracket Setup
              </h3>
              <p className="text-xs text-slate-400">
                Generate a single-elimination tournament tree for this competition. Choose the size of the playoffs and seed the players.
              </p>
            </div>

            {isAdmin ? (
              <div className="space-y-4">
                {/* Size Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2">Bracket Size</label>
                  <div className="flex gap-2">
                    {([
                      { value: 2, label: 'Semifinals (4 Players)' },
                      { value: 4, label: 'Quarterfinals (8 Players)' }
                    ] as const).map(opt => (
                      <Button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSizeChange(opt.value)}
                        variant={bracketSize === opt.value ? 'primary' : 'secondary'}
                        className="text-xs py-1.5 px-3 rounded-lg cursor-pointer"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Seed Pairings Selectors */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {pairings.map((p, idx) => (
                    <div key={idx} className="border border-white/5 bg-slate-950/40 p-3 rounded-lg space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-[10px] font-bold uppercase text-[var(--arena-blue)]">Matchup {idx + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Player/Pair A</label>
                          <select
                            value={p.aId}
                            onChange={(e) => handlePairingChange(idx, 'aId', e.target.value)}
                            className="w-full text-xs rounded border border-white/10 bg-slate-950 p-2 text-white"
                          >
                            <option value="">Select player...</option>
                            {participants.map(part => (
                              <option key={part.id} value={part.id}>{part.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Player/Pair B</label>
                          <select
                            value={p.bId}
                            onChange={(e) => handlePairingChange(idx, 'bId', e.target.value)}
                            className="w-full text-xs rounded border border-white/10 bg-slate-950 p-2 text-white"
                          >
                            <option value="">Select player...</option>
                            {participants.map(part => (
                              <option key={part.id} value={part.id}>{part.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-4 border-t border-white/5">
                  <Button
                    onClick={handleCreateBracket}
                    disabled={isSubmitting}
                    className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 gap-1.5 uppercase font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                  >
                    <Zap size={14} />
                    {isSubmitting ? 'Generating...' : 'Create Playoff Bracket'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 italic text-sm">
                Playoff bracket has not been generated by the administrators yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Connector Line Rendering Component
  const RoundConnector = ({ matchCount, nextMatchCount }: { matchCount: number; nextMatchCount: number }) => {
    // Generate SVG path connectors between round nodes
    const paths = Array.from({ length: matchCount }).map((_, idx) => {
      const nextIdx = Math.floor(idx / 2)
      
      const y1 = ((2 * idx + 1) * 100) / (2 * matchCount)
      const y2 = ((2 * nextIdx + 1) * 100) / (2 * nextMatchCount)
      
      const matchup = rounds[maxRound - Math.log2(matchCount) + 1]?.[idx]
      const isWinner = matchup?.winner_participant_id !== null && matchup?.winner_participant_id !== undefined
      const isLive = matchup?.status === 'live'
      
      // Determine connector color
      let strokeColor = 'rgba(255, 255, 255, 0.08)'
      if (isWinner) strokeColor = 'var(--arena-lime)'
      else if (isLive) strokeColor = 'var(--arena-blue)'

      // Draw horizontal-vertical path
      return (
        <path
          key={idx}
          d={`M 0 ${y1}% L 50% ${y1}% L 50% ${y2}% L 100% ${y2}%`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={isWinner ? 2 : 1}
          className="transition-all duration-300"
        />
      )
    })

    return (
      <div className="relative w-12 self-stretch flex-shrink-0 hidden md:block">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {paths}
        </svg>
      </div>
    )
  }

  // Playoff Bracket Visualization
  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-thin">
      <div className="flex items-center gap-0 md:gap-4 min-w-[700px] h-[500px] p-2 bg-[#040d0f]">
        {Object.keys(rounds).map((roundStr, rIdx) => {
          const roundNum = Number(roundStr)
          const roundMatchups = rounds[roundNum]
          const isLastRound = rIdx === Object.keys(rounds).length - 1

          return (
            <div key={roundNum} className="flex items-center self-stretch">
              {/* Round Matchup Cards Column */}
              <div className="flex flex-col justify-around h-full w-64 flex-shrink-0 space-y-4">
                <div className="text-center">
                  <Badge variant="blue" className="text-[10px] font-black uppercase tracking-wider bg-slate-900 border-white/5 py-0.5 px-2">
                    {getRoundName(roundNum, maxRound)}
                  </Badge>
                </div>
                
                {roundMatchups.map(m => {
                  const hasWinner = m.winner_participant_id !== null
                  const isWinnerA = m.winner_participant_id === m.participant_a_id
                  const isWinnerB = m.winner_participant_id === m.participant_b_id

                  return (
                    <Card
                      key={m.id}
                      className={cn(
                        "border border-white/5 bg-[#0a0f0e] shadow-xl overflow-hidden hover:border-white/10 transition-all",
                        m.status === 'live' && "border-[var(--arena-blue)]/40 ring-1 ring-[var(--arena-blue)]/20"
                      )}
                    >
                      <CardContent className="p-2 space-y-1.5 text-xs">
                        {/* Player A Row */}
                        <div className="flex justify-between items-center py-1">
                          <span
                            className={cn(
                              "font-bold truncate max-w-[160px]",
                              hasWinner ? (isWinnerA ? "text-[var(--arena-lime)]" : "text-slate-500") : "text-slate-350"
                            )}
                          >
                            {m.participant_a?.name || 'TBD Winner'}
                          </span>
                          {m.status === 'completed' && m.match?.score_sets && (
                            <span className="font-mono font-bold text-slate-500">
                              {m.match.score_sets.map(set => set.team1_score).join('/')}
                            </span>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/5 flex items-center justify-center relative my-0.5">
                          <Swords size={10} className="text-slate-700 bg-[#0a0f0e] px-1 absolute" />
                        </div>

                        {/* Player B Row */}
                        <div className="flex justify-between items-center py-1">
                          <span
                            className={cn(
                              "font-bold truncate max-w-[160px]",
                              hasWinner ? (isWinnerB ? "text-[var(--arena-lime)]" : "text-slate-500") : "text-slate-350"
                            )}
                          >
                            {m.participant_b?.name || 'TBD Winner'}
                          </span>
                          {m.status === 'completed' && m.match?.score_sets && (
                            <span className="font-mono font-bold text-slate-500">
                              {m.match.score_sets.map(set => set.team2_score).join('/')}
                            </span>
                          )}
                        </div>

                        {/* Record Action for Admins */}
                        {m.status !== 'completed' && isAdmin && onRecordScore && (
                          <div className="pt-1 border-t border-white/5 flex justify-end">
                            <button
                              onClick={() => onRecordScore(m)}
                              className="text-[9px] font-extrabold uppercase text-[var(--arena-lime)] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Swords size={9} /> Record Score
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Render Connector Lines if not the last round */}
              {!isLastRound && (
                <RoundConnector
                  matchCount={roundMatchups.length}
                  nextMatchCount={rounds[roundNum + 1]?.length || 1}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
