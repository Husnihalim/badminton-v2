import { useState } from 'react'
import { Plus, X, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import type { User } from '../../types'

interface PairRegistrationFormProps {
  clubMembers: User[]
  requiredPairs: number
  onSubmit: (pairs: { pair_name: string; player_1_id: string; player_2_id?: string }[]) => void
  isLoading?: boolean
}

export function PairRegistrationForm({
  clubMembers,
  requiredPairs,
  onSubmit,
  isLoading = false,
}: PairRegistrationFormProps) {
  const [pairs, setPairs] = useState<
    { pair_name: string; player_1_id: string; player_2_id: string }[]
  >([])
  const [isAdding, setIsAdding] = useState(false)
  const [newPair, setNewPair] = useState({
    pair_name: '',
    player_1_id: '',
    player_2_id: '',
  })

  const handleAddPair = () => {
    if (!newPair.player_1_id) return

    const pairName =
      newPair.pair_name ||
      `${getPlayerName(newPair.player_1_id)}${
        newPair.player_2_id ? ` / ${getPlayerName(newPair.player_2_id)}` : ''
      }`

    setPairs([
      ...pairs,
      {
        pair_name: pairName,
        player_1_id: newPair.player_1_id,
        player_2_id: newPair.player_2_id,
      },
    ])

    setNewPair({ pair_name: '', player_1_id: '', player_2_id: '' })
    setIsAdding(false)
  }

  const handleRemovePair = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index))
  }

  const getPlayerName = (playerId: string) => {
    const player = clubMembers.find((m) => m.id === playerId)
    return player?.display_name || player?.name || 'Unknown'
  }

  const availablePlayers = clubMembers.filter(
    (m) =>
      !pairs.some((p) => p.player_1_id === m.id || p.player_2_id === m.id) &&
      m.id !== newPair.player_1_id
  )



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Register Your Pairs</p>
          <p className="text-xs text-slate-400">
            {pairs.length} of {requiredPairs} pairs added
          </p>
        </div>
        <Badge variant={pairs.length === requiredPairs ? 'live' : 'muted'}>
          {pairs.length === requiredPairs ? 'Ready' : 'Incomplete'}
        </Badge>
      </div>

      {/* Pair List */}
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <Card key={index} className="border-white/10 bg-white/5">
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-[var(--arena-lime)]">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-white">{pair.pair_name}</p>
                  <p className="text-xs text-slate-400">
                    {getPlayerName(pair.player_1_id)}
                    {pair.player_2_id && ` / ${getPlayerName(pair.player_2_id)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemovePair(index)}
                className="rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-red-400"
              >
                <X size={16} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Pair Form */}
      {isAdding && pairs.length < requiredPairs && (
        <Card className="border-[var(--arena-lime)]/30">
          <CardContent className="space-y-3 p-4">
            <Input
              placeholder="Pair name (optional, e.g., 'The A Team')"
              value={newPair.pair_name}
              onChange={(e) => setNewPair({ ...newPair, pair_name: e.target.value })}
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
            />

            <div className="space-y-2">
              <p className="text-xs text-slate-400">Player 1 *</p>
              <div className="grid grid-cols-2 gap-2">
                {clubMembers
                  .filter((m) => !pairs.some((p) => p.player_1_id === m.id || p.player_2_id === m.id))
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setNewPair({ ...newPair, player_1_id: member.id })}
                      className={`
                        rounded-lg border p-2 text-left text-sm transition-colors
                        ${
                          newPair.player_1_id === member.id
                            ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]'
                            : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                        }
                      `}
                    >
                      {member.display_name || member.name}
                    </button>
                  ))}
              </div>
            </div>

            {newPair.player_1_id && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Player 2 (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewPair({ ...newPair, player_2_id: '' })}
                    className={`
                      rounded-lg border p-2 text-left text-sm transition-colors
                      ${
                        !newPair.player_2_id
                          ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]'
                          : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                      }
                    `}
                  >
                    Singles
                  </button>
                  {availablePlayers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setNewPair({ ...newPair, player_2_id: member.id })}
                      className={`
                        rounded-lg border p-2 text-left text-sm transition-colors
                        ${
                          newPair.player_2_id === member.id
                            ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]'
                            : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                        }
                      `}
                    >
                      {member.display_name || member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false)
                  setNewPair({ pair_name: '', player_1_id: '', player_2_id: '' })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddPair}
                disabled={!newPair.player_1_id}
                className="flex-1 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90 disabled:opacity-50"
              >
                Add Pair
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Button */}
      {!isAdding && pairs.length < requiredPairs && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsAdding(true)}
          className="w-full gap-2 border-dashed border-white/20"
        >
          <Plus size={16} />
          Add Pair ({requiredPairs - pairs.length} remaining)
        </Button>
      )}

      {/* Submit */}
      {pairs.length === requiredPairs && (
        <Button
          type="button"
          onClick={() => onSubmit(pairs)}
          disabled={isLoading}
          className="w-full gap-2 bg-[var(--arena-lime)] py-6 text-lg font-bold text-black hover:bg-[var(--arena-lime)]/90"
        >
          <Users size={18} />
          {isLoading ? 'Confirming...' : 'Confirm Pairs'}
        </Button>
      )}
    </div>
  )
}
