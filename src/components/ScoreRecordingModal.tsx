import { useCallback, useEffect, useState } from 'react'
import { ClipboardPenLine, Plus, Trash2, X } from 'lucide-react'
import { createMatch, getClubMembers, updateMatch } from '../lib/api'
import { getErrorMessage } from '../lib/utils'
import type { MatchWithDetails, Membership } from '../types'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'

interface ScoreRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  clubId?: string
  editingMatch?: MatchWithDetails | null
  onScoreRecorded?: () => void
}

type PlayerField = {
  memberId: string
  customName: string
}

type ScoreSetField = {
  team1: string
  team2: string
}

function createPlayerField(): PlayerField {
  return { memberId: '', customName: '' }
}

function createScoreSetField(): ScoreSetField {
  return { team1: '', team2: '' }
}

function getPlayerName(field: PlayerField, members: Membership[]): string {
  if (field.customName.trim()) return field.customName.trim()
  if (field.memberId) {
    const member = members.find((m) => m.user_id === field.memberId)
    if (member) return member.name || 'Unknown'
  }
  return ''
}

function isPlayerValid(field: PlayerField): boolean {
  return Boolean(field.memberId || field.customName.trim())
}

export default function ScoreRecordingModal({ isOpen, onClose, clubId, editingMatch, onScoreRecorded }: ScoreRecordingModalProps) {
  const [matchTitle, setMatchTitle] = useState('')
  const [matchDate, setMatchDate] = useState<string>('')
  const [sport, setSport] = useState('badminton')
  const [matchType, setMatchType] = useState('singles')
  const [player1A, setPlayer1A] = useState<PlayerField>(createPlayerField())
  const [player1B, setPlayer1B] = useState<PlayerField>(createPlayerField())
  const [player2A, setPlayer2A] = useState<PlayerField>(createPlayerField())
  const [player2B, setPlayer2B] = useState<PlayerField>(createPlayerField())
  const [sets, setSets] = useState<ScoreSetField[]>([createScoreSetField()])
  const [toast, setToast] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<Membership[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!clubId) return
    try {
      const data = await getClubMembers(clubId)
      setMembers(data)
    } catch (err) {
      console.error('Error loading members:', err)
    }
  }, [clubId])

  useEffect(() => {
    if (isOpen && clubId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMembers()
    }
  }, [isOpen, clubId, loadMembers])

  useEffect(() => {
    if (!isOpen) return

    if (editingMatch) {
      setMatchTitle(editingMatch.title || '')
      setMatchDate(editingMatch.match_date)
      setSport(editingMatch.sport)
      setMatchType(editingMatch.match_type)

      const team1 = editingMatch.participants.filter((participant) => participant.team === 1)
      const team2 = editingMatch.participants.filter((participant) => participant.team === 2)

      const createFieldFromParticipant = (participant?: MatchWithDetails['participants'][number]) => {
        if (!participant) return createPlayerField()
        return {
          memberId: participant.user_id || '',
          customName: participant.user_id ? '' : participant.guest_name || '',
        }
      }

      setPlayer1A(createFieldFromParticipant(team1[0]))
      setPlayer1B(createFieldFromParticipant(team1[1]))
      setPlayer2A(createFieldFromParticipant(team2[0]))
      setPlayer2B(createFieldFromParticipant(team2[1]))
      setSets(editingMatch.score_sets.map((set) => ({ team1: String(set.team1_score), team2: String(set.team2_score) })) || [createScoreSetField()])
      setErrors({})
    } else {
      setMatchTitle('')
      setMatchDate(new Date().toISOString().split('T')[0])
      setSport('badminton')
      setMatchType('singles')
      setPlayer1A(createPlayerField())
      setPlayer1B(createPlayerField())
      setPlayer2A(createPlayerField())
      setPlayer2B(createPlayerField())
      setSets([createScoreSetField()])
      setErrors({})
    }
  }, [editingMatch, isOpen])

  if (!isOpen) return null

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}

    if (matchTitle.length > 120) nextErrors.matchTitle = 'Match title must be 120 characters or fewer.'
    if (!matchDate) nextErrors.matchDate = 'Match date is required.'
    if (!isPlayerValid(player1A)) nextErrors.player1A = 'Player 1 is required.'
    if (!isPlayerValid(player2A)) nextErrors.player2A = 'Player 2 is required.'

    if (matchType === 'doubles') {
      if (!isPlayerValid(player1B)) nextErrors.player1B = 'Team 1 Player 2 is required.'
      if (!isPlayerValid(player2B)) nextErrors.player2B = 'Team 2 Player 2 is required.'
    }

    sets.forEach((set, index) => {
      const team1Score = Number(set.team1)
      const team2Score = Number(set.team2)
      const setNumber = index + 1

      if (set.team1 === '' || Number.isNaN(team1Score) || team1Score < 0) {
        nextErrors[`set${setNumber}Team1`] = 'Enter a valid score.'
      }
      if (set.team2 === '' || Number.isNaN(team2Score) || team2Score < 0) {
        nextErrors[`set${setNumber}Team2`] = 'Enter a valid score.'
      }
      if (set.team1 !== '' && set.team2 !== '' && team1Score === team2Score) {
        nextErrors[`set${setNumber}`] = 'A set cannot end in a tie.'
      }
    })

    const names = [
      getPlayerName(player1A, members),
      matchType === 'doubles' ? getPlayerName(player1B, members) : null,
      getPlayerName(player2A, members),
      matchType === 'doubles' ? getPlayerName(player2B, members) : null,
    ].filter(Boolean) as string[]

    if (new Set(names).size !== names.length) nextErrors.duplicate = 'Each player must be unique.'
    if ([player1A, player1B, player2A, player2B].some((field) => field.customName.length > 120)) {
      nextErrors.duplicate = 'Guest names must be 120 characters or fewer.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const isEditing = Boolean(editingMatch)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !clubId) return

    setIsSubmitting(true)

    try {
      const scoreSets = sets.map((set, index) => ({
        set_number: index + 1,
        team1_score: Number(set.team1),
        team2_score: Number(set.team2),
      }))

      if (isEditing && editingMatch) {
        await updateMatch({
          match_id: editingMatch.id,
          title: matchTitle || undefined,
          sport,
          match_type: matchType as 'singles' | 'doubles',
          match_date: matchDate,
          score_sets: scoreSets,
        })
      } else {
        const participants: {
          team: 1 | 2
          userId?: string
          isGuest: boolean
          guestName?: string
        }[] = [
          { team: 1, userId: player1A.memberId || undefined, isGuest: !player1A.memberId, guestName: player1A.customName || undefined },
          { team: 2, userId: player2A.memberId || undefined, isGuest: !player2A.memberId, guestName: player2A.customName || undefined },
        ]

        if (matchType === 'doubles') {
          participants.push(
            { team: 1, userId: player1B.memberId || undefined, isGuest: !player1B.memberId, guestName: player1B.customName || undefined },
            { team: 2, userId: player2B.memberId || undefined, isGuest: !player2B.memberId, guestName: player2B.customName || undefined }
          )
        }

        await createMatch({
          club_id: clubId,
          title: matchTitle || undefined,
          sport,
          match_type: matchType as 'singles' | 'doubles',
          match_date: matchDate,
          participants: participants.map((p) => ({
            team: p.team,
            user_id: p.userId || undefined,
            is_guest: p.isGuest,
            guest_name: p.guestName || undefined,
          })),
          score_sets: scoreSets,
        })
      }

      const scoreSummary = sets.map((set) => `${set.team1}-${set.team2}`).join(', ')
      showToast(isEditing ? `Score updated: ${scoreSummary}` : `Score recorded: ${scoreSummary}`)
      setMatchTitle('')
      setMatchDate(new Date().toISOString().split('T')[0])
      setSport('badminton')
      setMatchType('singles')
      setSets([createScoreSetField()])
      setPlayer1A(createPlayerField())
      setPlayer1B(createPlayerField())
      setPlayer2A(createPlayerField())
      setPlayer2B(createPlayerField())
      setErrors({})
      
      onClose()
      onScoreRecorded?.()
    } catch (err) {
      console.error('Score recording failed:', err)
      const baseMessage = getErrorMessage(err, isEditing ? 'Failed to update score' : 'Failed to record score')
      const submitMessage = typeof err === 'object' && err !== null
        ? `${baseMessage}: ${JSON.stringify(err)}
` : baseMessage
      setErrors({ submit: submitMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPlayerField = (
    label: string,
    field: PlayerField,
    setField: (f: PlayerField) => void,
    errorKey: string,
    disabled = false,
  ) => (
    <label className="block space-y-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <Select
        value={field.memberId}
        onChange={(e) => setField({ memberId: e.target.value, customName: '' })}
        disabled={disabled}
      >
        <option value="">Select member</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>{m.name || 'Unknown'}</option>
        ))}
      </Select>
      <Input
        type="text"
        placeholder="Or enter guest name"
        value={field.customName}
        onChange={(e) => setField({ memberId: '', customName: e.target.value })}
        maxLength={120}
        disabled={disabled}
      />
      {errors[errorKey] ? <p className="text-xs font-medium text-red-600">{errors[errorKey]}</p> : null}
    </label>
  )

  const updateScoreSet = (index: number, field: keyof ScoreSetField, value: string) => {
    setSets((currentSets) => currentSets.map((set, setIndex) => (
      setIndex === index ? { ...set, [field]: value } : set
    )))
  }

  const addSet = () => {
    setSets((currentSets) => currentSets.length >= 3 ? currentSets : [...currentSets, createScoreSetField()])
  }

  const removeSet = (index: number) => {
    setSets((currentSets) => currentSets.length === 1
      ? currentSets
      : currentSets.filter((_, setIndex) => setIndex !== index)
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
        <Card className="max-h-[94vh] w-full overflow-auto rounded-b-none sm:max-w-2xl sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ClipboardPenLine size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{isEditing ? 'Edit match score' : 'Record match score'}</h2>
                  <p className="text-sm text-slate-600">
                    {isEditing ? 'Update the score and refresh the leaderboard for this match.' : 'Add singles or doubles results for this club.'}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </Button>
            </div>

            {errors.submit ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.submit}</p> : null}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Sport</span>
                  <Select value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="badminton">Badminton</option>
                    <option value="tennis">Tennis</option>
                    <option value="squash">Squash</option>
                    <option value="pickleball">Pickleball</option>
                    <option value="table tennis">Table tennis</option>
                    <option value="racquetball">Racquetball</option>
                  </Select>
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Match date</span>
                  <Input
                    type="date"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                  />
                  {errors.matchDate ? <p className="text-xs font-medium text-red-600">{errors.matchDate}</p> : null}
                </label>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1.5">Match type</p>
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {(['singles', 'doubles'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`min-h-10 rounded-md px-3 text-sm font-semibold capitalize transition ${matchType === type ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}
                      onClick={() => {
                        setMatchType(type)
                        if (type === 'singles') {
                          setPlayer1B(createPlayerField())
                          setPlayer2B(createPlayerField())
                        }
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Match title <span className="font-normal text-slate-500">(optional)</span></span>
                <Input
                  type="text"
                  placeholder="e.g. Monday Singles Game"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  maxLength={120}
                />
                {errors.matchTitle ? <p className="text-xs font-medium text-red-600">{errors.matchTitle}</p> : null}
              </label>

              <div className={matchType === 'doubles' ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
                {renderPlayerField('Player 1', player1A, setPlayer1A, 'player1A', isEditing)}
                {matchType === 'doubles' ? renderPlayerField('Team 1, Player 2', player1B, setPlayer1B, 'player1B', isEditing) : null}
                {renderPlayerField('Player 2', player2A, setPlayer2A, 'player2A', isEditing)}
                {matchType === 'doubles' ? renderPlayerField('Team 2, Player 2', player2B, setPlayer2B, 'player2B', isEditing) : null}
              </div>

              {errors.duplicate ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.duplicate}</p> : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Score sets</p>
                  <Button type="button" size="sm" variant="secondary" onClick={addSet} disabled={sets.length >= 3}>
                    <Plus size={15} aria-hidden="true" />
                    Add set
                  </Button>
                </div>
                <div className="space-y-2">
                  {sets.map((set, index) => {
                    const setNumber = index + 1
                    const setError = errors[`set${setNumber}`] || errors[`set${setNumber}Team1`] || errors[`set${setNumber}Team2`]

                    return (
                      <div key={setNumber} className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-700">Set {setNumber}</span>
                          {sets.length > 1 ? (
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeSet(index)} aria-label={`Remove set ${setNumber}`}>
                              <Trash2 size={15} aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Team 1"
                            value={set.team1}
                            onChange={(e) => updateScoreSet(index, 'team1', e.target.value)}
                            min={0}
                          />
                          <span className="text-lg font-bold text-slate-400">-</span>
                          <Input
                            type="number"
                            placeholder="Team 2"
                            value={set.team2}
                            onChange={(e) => updateScoreSet(index, 'team2', e.target.value)}
                            min={0}
                          />
                        </div>
                        {setError ? <p className="text-xs font-medium text-red-600">{setError}</p> : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update score' : 'Record score'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {toast ? <div className="fixed bottom-4 left-4 right-4 z-[60] rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{toast}</div> : null}
    </>
  )
}
