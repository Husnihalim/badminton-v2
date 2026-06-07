import { useEffect, useState } from 'react'
import { Trophy, CheckCircle2, Circle, Clock, Play } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { subscribeToFriendly, subscribeToMatchups, getFriendlyMatchups } from '../../lib/friendlyApi'
import type { Friendly, FriendlyMatchup } from '../../types/friendly'

interface FriendlyScoreboardProps {
  friendly: Friendly
  onRecordMatch?: (matchup: FriendlyMatchup) => void
}

export function FriendlyScoreboard({ friendly, onRecordMatch }: FriendlyScoreboardProps) {
  const [matchups, setMatchups] = useState<FriendlyMatchup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMatchups()

    // Subscribe to realtime updates
    const friendlySub = subscribeToFriendly(friendly.id, () => {
      // Refresh on friendly update
    })

    const matchupsSub = subscribeToMatchups(friendly.id, (payload) => {
      setMatchups((prev) => {
        const index = prev.findIndex((m) => m.id === payload.new.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = payload.new as FriendlyMatchup
          return updated
        }
        return [...prev, payload.new as FriendlyMatchup]
      })
    })

    return () => {
      friendlySub.unsubscribe()
      matchupsSub.unsubscribe()
    }
  }, [friendly.id])

  const loadMatchups = async () => {
    const { matchups, error } = await getFriendlyMatchups(friendly.id)
    if (!error && matchups) {
      setMatchups(matchups)
    }
    setIsLoading(false)
  }

  // Calculate scores
  const invitingClubWins = matchups.filter(
    (m) => m.status === 'completed' && m.winner_club_id === friendly.inviting_club_id
  ).length
  const invitedClubWins = matchups.filter(
    (m) => m.status === 'completed' && m.winner_club_id === friendly.invited_club_id
  ).length

  const totalMatches = friendly.pair_count
  const completedMatches = matchups.filter((m) => m.status === 'completed').length
  const remainingMatches = totalMatches - completedMatches

  const isComplete = friendly.status === 'completed'
  const isLive = friendly.status === 'live'

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-[#0a0f0e]">
        <CardContent className="p-6 text-center">
          <p className="text-slate-400">Loading scoreboard...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Scoreboard */}
      <Card className={isLive ? 'border-[var(--arena-lime)]/50' : 'border-white/10'}>
        <CardContent className="p-6">
          {/* Status */}
          <div className="mb-4 flex items-center justify-between">
            {isLive && <Badge variant="live">LIVE</Badge>}
            {isComplete && <Badge variant="blue">COMPLETED</Badge>}
            {!isLive && !isComplete && <Badge variant="muted">{friendly.status}</Badge>}
          </div>

          {/* Score */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-400">{friendly.inviting_club?.name}</p>
              <p className={`arena-score-number text-5xl ${isComplete && invitingClubWins > invitedClubWins ? 'text-[var(--arena-lime)]' : ''}`}>
                {invitingClubWins}
              </p>
            </div>
            <div className="text-2xl font-bold text-slate-500">-</div>
            <div className="text-center">
              <p className="text-sm text-slate-400">{friendly.invited_club?.name || friendly.invited_club_name}</p>
              <p className={`arena-score-number text-5xl ${isComplete && invitedClubWins > invitingClubWins ? 'text-[var(--arena-lime)]' : ''}`}>
                {invitedClubWins}
              </p>
            </div>
          </div>

          {/* Progress */}
          {!isComplete && (
            <p className="text-center text-sm text-slate-400">
              {completedMatches} of {totalMatches} matches complete
              {remainingMatches > 0 && ` • ${remainingMatches} remaining`}
            </p>
          )}

          {/* Winner */}
          {isComplete && friendly.winning_club_id && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[var(--arena-lime)]">
              <Trophy size={20} />
              <span className="font-bold">
                {friendly.winning_club_id === friendly.inviting_club_id
                  ? friendly.inviting_club?.name
                  : friendly.invited_club?.name || friendly.invited_club_name}{' '}
                takes the friendly!
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match List */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Matches</p>
        
        {matchups.map((matchup, index) => (
          <MatchupRow
            key={matchup.id}
            matchup={matchup}
            matchNumber={index + 1}
            invitingClubName={friendly.inviting_club?.name || ''}
            invitedClubName={friendly.invited_club?.name || friendly.invited_club_name}
            onRecord={() => onRecordMatch?.(matchup)}
          />
        ))}

        {/* Placeholder for pending matchups */}
        {matchups.length < totalMatches &&
          Array.from({ length: totalMatches - matchups.length }).map((_, i) => (
            <Card key={`pending-${i}`} className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-slate-500">Match {matchups.length + i + 1}</span>
                <span className="text-xs text-slate-600">Waiting for matchmaking...</span>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

interface MatchupRowProps {
  matchup: FriendlyMatchup
  matchNumber: number
  invitingClubName: string
  invitedClubName: string
  onRecord: () => void
}

function MatchupRow({ matchup, matchNumber, invitingClubName, invitedClubName, onRecord }: MatchupRowProps) {
  const isCompleted = matchup.status === 'completed'
  const isLive = matchup.status === 'live'
  
  const pairAName = matchup.pair_a?.pair_name || 'TBD'
  const pairBName = matchup.pair_b?.pair_name || 'TBD'
  
  const scoreA = matchup.match?.score_sets?.filter((s) => s.team1_score > s.team2_score).length || 0
  const scoreB = matchup.match?.score_sets?.filter((s) => s.team2_score > s.team1_score).length || 0

  const winnerA = isCompleted && matchup.winner_club_id === matchup.pair_a?.club_id
  const winnerB = isCompleted && matchup.winner_club_id === matchup.pair_b?.club_id

  return (
    <Card
      className={`
        ${isLive ? 'border-[var(--arena-lime)]/50 animate-pulse' : ''}
        ${isCompleted ? 'border-white/10' : 'border-white/5 bg-white/[0.02]'}
      `}
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">Match {matchNumber}</span>
          {isLive && <Badge variant="live">LIVE</Badge>}
          {isCompleted && <CheckCircle2 size={16} className="text-[var(--arena-lime)]" />}
          {!isLive && !isCompleted && <Circle size={16} className="text-slate-600" />}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Pair A */}
          <div className={`flex-1 ${winnerA ? 'text-[var(--arena-lime)]' : 'text-white'}`}>
            <p className="font-bold">{pairAName}</p>
            <p className="text-xs text-slate-400">{invitingClubName}</p>
          </div>

          {/* Score */}
          <div className="text-center">
            {isCompleted || isLive ? (
              <div className="flex items-center gap-2 text-xl font-bold">
                <span className={winnerA ? 'text-[var(--arena-lime)]' : ''}>{scoreA}</span>
                <span className="text-slate-500">-</span>
                <span className={winnerB ? 'text-[var(--arena-lime)]' : ''}>{scoreB}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">vs</span>
            )}
          </div>

          {/* Pair B */}
          <div className={`flex-1 text-right ${winnerB ? 'text-[var(--arena-lime)]' : 'text-white'}`}>
            <p className="font-bold">{pairBName}</p>
            <p className="text-xs text-slate-400">{invitedClubName}</p>
          </div>
        </div>

        {/* Action */}
        {!isCompleted && (
          <Button
            onClick={onRecord}
            size="sm"
            className="mt-3 w-full gap-2 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
          >
            {isLive ? (
              <>
                <Play size={14} />
                Record Result
              </>
            ) : (
              <>
                <Clock size={14} />
                Waiting...
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
