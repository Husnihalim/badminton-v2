import { useCallback, useEffect, useState } from 'react'
import { ClipboardPenLine, X } from 'lucide-react'
import { createMatch, getClubMembers } from '../lib/api'
import type { Membership } from '../types'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'

interface ScoreRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  clubId?: string
  onScoreRecorded?: () => void
}

type PlayerField = {
  memberId: string
  customName: string
}

function createPlayerField(): PlayerField {
  return { memberId: '', customName: '' }
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

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export default function ScoreRecordingModal({ isOpen, onClose, clubId, onScoreRecorded }: ScoreRecordingModalProps) {
  const [matchTitle, setMatchTitle] = useState('')
  const [sport, setSport] = useState('badminton')
  const [matchType, setMatchType] = useState('singles')
  const [player1A, setPlayer1A] = useState<PlayerField>(createPlayerField())
  const [player1B, setPlayer1B] = useState<PlayerField>(createPlayerField())
  const [player2A, setPlayer2A] = useState<PlayerField>(createPlayerField())
  const [player2B, setPlayer2B] = useState<PlayerField>(createPlayerField())
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
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

  if (!isOpen) return null

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}

    if (!matchTitle.trim()) nextErrors.matchTitle = 'Match title is required.'
    if (!isPlayerValid(player1A)) nextErrors.player1A = 'Player 1 is required.'
    if (!isPlayerValid(player2A)) nextErrors.player2A = 'Player 2 is required.'

    if (matchType === 'doubles') {
      if (!isPlayerValid(player1B)) nextErrors.player1B = 'Team 1 Player 2 is required.'
      if (!isPlayerValid(player2B)) nextErrors.player2B = 'Team 2 Player 2 is required.'
    }

    const s1 = Number(score1)
    const s2 = Number(score2)
    if (score1 === '' || Number.isNaN(s1) || s1 < 0) nextErrors.score1 = 'Enter a valid score.'
    if (score2 === '' || Number.isNaN(s2) || s2 < 0) nextErrors.score2 = 'Enter a valid score.'

    const names = [
      getPlayerName(player1A, members),
      matchType === 'doubles' ? getPlayerName(player1B, members) : null,
      getPlayerName(player2A, members),
      matchType === 'doubles' ? getPlayerName(player2B, members) : null,
    ].filter(Boolean) as string[]

    if (new Set(names).size !== names.length) nextErrors.duplicate = 'Each player must be unique.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !clubId) return

    setIsSubmitting(true)

    try {
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
        title: matchTitle,
        sport,
        match_type: matchType as 'singles' | 'doubles',
        participants: participants.map((p) => ({
          team: p.team,
          user_id: p.userId || undefined,
          is_guest: p.isGuest,
          guest_name: p.guestName || undefined,
        })),
        score_sets: [
          { set_number: 1, team1_score: Number(score1), team2_score: Number(score2) }
        ],
      })

      showToast(`Score recorded: ${score1}-${score2}`)
      setMatchTitle('')
      setScore1('')
      setScore2('')
      setPlayer1A(createPlayerField())
      setPlayer1B(createPlayerField())
      setPlayer2A(createPlayerField())
      setPlayer2B(createPlayerField())
      setErrors({})
      
      onClose()
      onScoreRecorded?.()
    } catch (err) {
      setErrors({ submit: getErrorMessage(err, 'Failed to record score') })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPlayerField = (
    label: string,
    field: PlayerField,
    setField: (f: PlayerField) => void,
    errorKey: string,
  ) => (
    <label className="block space-y-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <Select
        value={field.memberId}
        onChange={(e) => setField({ memberId: e.target.value, customName: '' })}
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
      />
      {errors[errorKey] ? <p className="text-xs font-medium text-red-600">{errors[errorKey]}</p> : null}
    </label>
  )

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
                  <h2 className="text-xl font-bold text-slate-950">Record match score</h2>
                  <p className="text-sm text-slate-600">Add singles or doubles results for this club.</p>
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
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-700">Match type</p>
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
              </div>

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Match title</span>
                <Input
                  type="text"
                  placeholder="e.g. Monday Singles Game"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                />
                {errors.matchTitle ? <p className="text-xs font-medium text-red-600">{errors.matchTitle}</p> : null}
              </label>

              <div className={matchType === 'doubles' ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
                {renderPlayerField('Player 1', player1A, setPlayer1A, 'player1A')}
                {matchType === 'doubles' ? renderPlayerField('Team 1, Player 2', player1B, setPlayer1B, 'player1B') : null}
                {renderPlayerField('Player 2', player2A, setPlayer2A, 'player2A')}
                {matchType === 'doubles' ? renderPlayerField('Team 2, Player 2', player2B, setPlayer2B, 'player2B') : null}
              </div>

              {errors.duplicate ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.duplicate}</p> : null}

              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">Score</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input type="number" placeholder="Team 1" value={score1} onChange={(e) => setScore1(e.target.value)} min={0} />
                  <span className="text-lg font-bold text-slate-400">-</span>
                  <Input type="number" placeholder="Team 2" value={score2} onChange={(e) => setScore2(e.target.value)} min={0} />
                </div>
                {errors.score1 || errors.score2 ? <p className="text-xs font-medium text-red-600">{errors.score1 || errors.score2}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Record score'}
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
