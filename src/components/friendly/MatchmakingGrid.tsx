import { useState } from 'react'
import { Check, Lock, Unlock } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import type { FriendlyPair, FriendlyMatchup } from '../../types/friendly'

interface MatchmakingGridProps {
  pairsA: FriendlyPair[]
  pairsB: FriendlyPair[]
  isLocked: boolean
  existingMatchups?: FriendlyMatchup[]
  onLock: (matchups: { pair_a_id: string; pair_b_id: string }[]) => void
  isLoading?: boolean
}

export function MatchmakingGrid({
  pairsA,
  pairsB,
  isLocked,
  existingMatchups = [],
  onLock,
  isLoading = false,
}: MatchmakingGridProps) {
  const [matchups, setMatchups] = useState<(FriendlyPair | null)[]>(
    existingMatchups.length > 0
      ? existingMatchups.map((m) => pairsB.find((p) => p.id === m.pair_b_id) || null)
      : new Array(pairsA.length).fill(null)
  )
  const [selectedPairA, setSelectedPairA] = useState<number | null>(null)

  const handleSelectPairA = (index: number) => {
    if (isLocked) return
    setSelectedPairA(index)
  }

  const handleSelectPairB = (pairB: FriendlyPair) => {
    if (isLocked || selectedPairA === null) return

    // Check if this pair B is already selected
    const existingIndex = matchups.findIndex((m) => m?.id === pairB.id)
    if (existingIndex >= 0 && existingIndex !== selectedPairA) {
      // Swap or clear the existing one
      const newMatchups = [...matchups]
      newMatchups[existingIndex] = null
      newMatchups[selectedPairA] = pairB
      setMatchups(newMatchups)
    } else {
      const newMatchups = [...matchups]
      newMatchups[selectedPairA] = pairB
      setMatchups(newMatchups)
    }

    setSelectedPairA(null)
  }

  const handleClearMatchup = (index: number) => {
    if (isLocked) return
    const newMatchups = [...matchups]
    newMatchups[index] = null
    setMatchups(newMatchups)
  }

  const handleLock = () => {
    const validMatchups = matchups
      .map((m, index) => ({
        pair_a_id: pairsA[index].id,
        pair_b_id: m?.id,
      }))
      .filter((m) => m.pair_b_id)

    if (validMatchups.length === pairsA.length) {
      onLock(validMatchups as { pair_a_id: string; pair_b_id: string }[])
    }
  }

  const allMatchupsSet = matchups.every((m) => m !== null)

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <Badge variant={isLocked ? 'blue' : 'live'}>
          {isLocked ? (
            <>
              <Lock size={12} className="mr-1" />
              Locked
            </>
          ) : (
            <>
              <Unlock size={12} className="mr-1" />
              Matchmaking
            </>
          )}
        </Badge>
        <span className="text-xs text-slate-400">
          {matchups.filter(Boolean).length} of {pairsA.length} set
        </span>
      </div>

      {/* Grid */}
      <div className="space-y-2">
        {pairsA.map((pairA, index) => (
          <MatchupRow
            key={pairA.id}
            pairA={pairA}
            pairB={matchups[index]}
            isSelected={selectedPairA === index}
            isLocked={isLocked}
            onSelect={() => handleSelectPairA(index)}
            onClear={() => handleClearMatchup(index)}
          />
        ))}
      </div>

      {/* Pair B Selection */}
      {!isLocked && selectedPairA !== null && (
        <Card className="border-[var(--arena-lime)]/30">
          <CardContent className="p-4">
            <p className="mb-3 text-sm text-slate-400">
              Select opponent for <span className="font-bold text-white">{pairsA[selectedPairA].pair_name}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {pairsB.map((pairB) => {
                const isSelected = matchups.some((m) => m?.id === pairB.id)
                return (
                  <button
                    key={pairB.id}
                    onClick={() => handleSelectPairB(pairB)}
                    disabled={isSelected}
                    className={`
                      rounded-lg border p-3 text-left transition-colors
                      ${isSelected
                        ? 'border-white/5 bg-white/5 opacity-50'
                        : 'border-white/10 bg-white/5 hover:border-[var(--arena-lime)] hover:bg-white/10'
                      }
                    `}
                  >
                    <p className={`font-bold ${isSelected ? 'text-slate-500' : 'text-white'}`}>
                      {pairB.pair_name}
                    </p>
                    {isSelected && <p className="text-xs text-slate-500">Already matched</p>}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock Button */}
      {!isLocked && (
        <Button
          onClick={handleLock}
          disabled={!allMatchupsSet || isLoading}
          className="w-full gap-2 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 disabled:opacity-50"
        >
          {isLoading ? (
            'Locking...'
          ) : (
            <>
              <Lock size={16} />
              {allMatchupsSet ? 'Lock Matchmaking' : 'Set all matchups to lock'}
            </>
          )}
        </Button>
      )}
    </div>
  )
}

interface MatchupRowProps {
  pairA: FriendlyPair
  pairB: FriendlyPair | null
  isSelected: boolean
  isLocked: boolean
  onSelect: () => void
  onClear: () => void
}

function MatchupRow({ pairA, pairB, isSelected, isLocked, onSelect, onClear }: MatchupRowProps) {
  return (
    <Card
      className={`
        cursor-pointer transition-colors
        ${isSelected ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10' : 'border-white/10'}
        ${pairB ? 'bg-white/5' : 'bg-white/[0.02]'}
      `}
      onClick={onSelect}
    >
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex-1">
          <p className="font-bold text-white">{pairA.pair_name}</p>
          <p className="text-xs text-slate-400">
            {pairA.player_1?.display_name || pairA.player_1?.name}
            {pairA.player_2 && ` / ${pairA.player_2?.display_name || pairA.player_2?.name}`}
          </p>
        </div>

        <div className="px-4 text-slate-500">vs</div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {pairB ? (
            <>
              <div className="text-right">
                <p className="font-bold text-white">{pairB.pair_name}</p>
                <p className="text-xs text-slate-400">
                  {pairB.player_1?.display_name || pairB.player_1?.name}
                  {pairB.player_2 && ` / ${pairB.player_2?.display_name || pairB.player_2?.name}`}
                </p>
              </div>
              {!isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClear()
                  }}
                  className="rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-red-400"
                >
                  <span className="sr-only">Clear</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              )}
              {isLocked && <Check size={16} className="text-[var(--arena-lime)]" />}
            </>
          ) : (
            <span className="text-sm text-slate-500">
              {isSelected ? 'Select opponent...' : 'Click to set'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
