import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardPenLine, Plus, X, RotateCcw, Trophy } from 'lucide-react'
import { createMatch, getClubMembers, updateMatch } from '../lib/api'
import { getErrorMessage } from '../lib/utils'
import type { MatchWithDetails, Membership } from '../types'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'
import CelebrationConfetti from './CelebrationConfetti'

interface ScoreRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  clubId?: string
  editingMatch?: MatchWithDetails | null
  onScoreRecorded?: () => void
  eventId?: string
  eventTitle?: string
  eventDate?: string
  clubName?: string
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

export default function ScoreRecordingModal({
  isOpen,
  onClose,
  clubId,
  editingMatch,
  onScoreRecorded,
  eventId,
  eventTitle,
  eventDate,
  clubName,
}: ScoreRecordingModalProps) {
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
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationWinners, setCelebrationWinners] = useState('')
  const [celebrationScore, setCelebrationScore] = useState('')
  const celebrationTimerRef = useRef<NodeJS.Timeout | number | null>(null)

  // Point-by-point live referee scoring state
  const [showScorekeeper, setShowScorekeeper] = useState(false)
  const [refereeSets, setRefereeSets] = useState<{ team1: number; team2: number }[]>([{ team1: 0, team2: 0 }])
  const [currentSetIdx, setCurrentSetIdx] = useState(0)
  const [refereeHistory, setRefereeHistory] = useState<{
    sets: { team1: number; team2: number }[]
    currentSetIdx: number
    logs: string[]
  }[]>([])
  const [refereeLogs, setRefereeLogs] = useState<string[]>([])

  const getTeamNames = (a: PlayerField, b: PlayerField) => {
    const nameA = getPlayerName(a, members) || (a === player1A ? 'Team 1' : 'Team 2')
    const nameB = matchType === 'doubles' ? getPlayerName(b, members) : ''
    return nameB ? `${nameA} & ${nameB}` : nameA
  }

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

  /* eslint-disable react-hooks/set-state-in-effect */
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
      setMatchDate(eventDate || new Date().toISOString().split('T')[0])
      setSport('badminton')
      setMatchType('singles')
      setPlayer1A(createPlayerField())
      setPlayer1B(createPlayerField())
      setPlayer2A(createPlayerField())
      setPlayer2B(createPlayerField())
      setSets([createScoreSetField()])
      setErrors({})
    }
  }, [editingMatch, isOpen, eventDate])
  /* eslint-enable react-hooks/set-state-in-effect */

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
          event_id: eventId || undefined,
        })
      }

      // Determine winner
      let team1Wins = 0
      let team2Wins = 0
      sets.forEach((set) => {
        const t1 = Number(set.team1)
        const t2 = Number(set.team2)
        if (t1 > t2) team1Wins++
        if (t2 > t1) team2Wins++
      })
      const isTeam1Winner = team1Wins > team2Wins
      const isTeam2Winner = team2Wins > team1Wins
      
      const winners = isTeam1Winner 
        ? getTeamNames(player1A, player1B) 
        : isTeam2Winner 
          ? getTeamNames(player2A, player2B) 
          : ''

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
      
      if (winners && !isEditing) {
        setCelebrationWinners(winners)
        setCelebrationScore(scoreSummary)
        setShowCelebration(true)
        
        const timer = setTimeout(() => {
          setShowCelebration(false)
          onClose()
          onScoreRecorded?.()
        }, 4000)
        
        celebrationTimerRef.current = timer
      } else {
        onClose()
        onScoreRecorded?.()
      }
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

  // Referee Mode Handlers
  const checkSetWinner = (t1: number, t2: number): 1 | 2 | 0 => {
    if (t1 >= 21 && t1 - t2 >= 2) return 1
    if (t2 >= 21 && t2 - t1 >= 2) return 2
    if (t1 === 30) return 1
    if (t2 === 30) return 2
    return 0
  }

  const getMatchWinner = (completedSets: { team1: number; team2: number }[]): 1 | 2 | 0 => {
    let team1Wins = 0
    let team2Wins = 0
    completedSets.forEach((s) => {
      const winner = checkSetWinner(s.team1, s.team2)
      if (winner === 1) team1Wins++
      if (winner === 2) team2Wins++
    })
    if (team1Wins >= 2) return 1
    if (team2Wins >= 2) return 2
    return 0
  }

  const openPointByPointScorekeeper = () => {
    setRefereeSets([{ team1: 0, team2: 0 }])
    setCurrentSetIdx(0)
    setRefereeHistory([])
    setRefereeLogs([])
    setShowScorekeeper(true)
  }

  const handleScorePoint = (team: 1 | 2) => {
    const currentMatchWinner = getMatchWinner(refereeSets)
    if (currentMatchWinner !== 0) return

    // Save history for undo
    const stateCopy = {
      sets: refereeSets.map((s) => ({ ...s })),
      currentSetIdx,
      logs: [...refereeLogs],
    }
    setRefereeHistory((prev) => [...prev, stateCopy])

    const nextSets = refereeSets.map((s) => ({ ...s }))
    if (team === 1) {
      nextSets[currentSetIdx].team1++
    } else {
      nextSets[currentSetIdx].team2++
    }

    const t1 = nextSets[currentSetIdx].team1
    const t2 = nextSets[currentSetIdx].team2
    
    const team1Name = getTeamNames(player1A, player1B)
    const team2Name = getTeamNames(player2A, player2B)
    const scorerName = team === 1 ? team1Name : team2Name
    const logMsg = `${scorerName} scores (${t1} - ${t2})`
    const nextLogs = [logMsg, ...refereeLogs]

    const setWinner = checkSetWinner(t1, t2)
    if (setWinner !== 0) {
      const setWinnerName = setWinner === 1 ? team1Name : team2Name
      nextLogs.unshift(`🏆 Set ${currentSetIdx + 1} won by ${setWinnerName} (${t1} - ${t2})`)
      
      setRefereeSets(nextSets)
      setRefereeLogs(nextLogs)

      const matchWinner = getMatchWinner(nextSets)
      if (matchWinner !== 0) {
        const matchWinnerName = matchWinner === 1 ? team1Name : team2Name
        nextLogs.unshift(`🎉 Match won by ${matchWinnerName}! Final score: ${nextSets.map(s => `${s.team1}-${s.team2}`).join(', ')}`)
        setRefereeLogs(nextLogs)
        return
      }

      if (currentSetIdx < 2) {
        setRefereeSets([...nextSets, { team1: 0, team2: 0 }])
        setCurrentSetIdx(currentSetIdx + 1)
      }
    } else {
      setRefereeSets(nextSets)
      setRefereeLogs(nextLogs)
    }
  }

  const handleUndo = () => {
    if (refereeHistory.length === 0) return
    const prevHistory = [...refereeHistory]
    const prevState = prevHistory.pop()!
    setRefereeHistory(prevHistory)
    setRefereeSets(prevState.sets)
    setCurrentSetIdx(prevState.currentSetIdx)
    setRefereeLogs(prevState.logs)
  }

  const applyRefereeScores = () => {
    const converted = refereeSets.map((s) => ({
      team1: String(s.team1),
      team2: String(s.team2),
    }))
    setSets(converted)
    setShowScorekeeper(false)
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

  const team1Name = getTeamNames(player1A, player1B)
  const team2Name = getTeamNames(player2A, player2B)
  const matchWinner = getMatchWinner(refereeSets)
  const isMatchFinished = matchWinner !== 0

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

            {eventTitle && eventId ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
                🏆 Linking to session: <span className="font-bold underline">{eventTitle}</span>
              </div>
            ) : null}

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
                      className={`min-h-10 rounded-md px-3 text-sm font-semibold capitalize transition ${matchType === type ? 'bg-[#0b1322] text-emerald-700 shadow-sm' : 'text-slate-300'}`}
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

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Team 1 Card */}
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#0b1322] p-4 shadow-sm">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                  <div className="mb-3 flex items-center justify-between pl-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Team 1</span>
                    {matchType === 'doubles' && <span className="text-[10px] uppercase font-bold text-slate-400">Doubles Pair</span>}
                  </div>
                  <div className="space-y-4 pl-2">
                    {renderPlayerField(
                      matchType === 'doubles' ? 'Player 1' : 'Player',
                      player1A,
                      setPlayer1A,
                      'player1A',
                      isEditing
                    )}
                    {matchType === 'doubles' ? renderPlayerField(
                      'Player 2',
                      player1B,
                      setPlayer1B,
                      'player1B',
                      isEditing
                    ) : null}
                  </div>
                </div>

                {/* Team 2 Card */}
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#0b1322] p-4 shadow-sm">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                  <div className="mb-3 flex items-center justify-between pl-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Team 2</span>
                    {matchType === 'doubles' && <span className="text-[10px] uppercase font-bold text-slate-400">Doubles Pair</span>}
                  </div>
                  <div className="space-y-4 pl-2">
                    {renderPlayerField(
                      matchType === 'doubles' ? 'Player 1' : 'Player',
                      player2A,
                      setPlayer2A,
                      'player2A',
                      isEditing
                    )}
                    {matchType === 'doubles' ? renderPlayerField(
                      'Player 2',
                      player2B,
                      setPlayer2B,
                      'player2B',
                      isEditing
                    ) : null}
                  </div>
                </div>
              </div>

              {errors.duplicate ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.duplicate}</p> : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Score sets</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="border border-emerald-600/30 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      onClick={openPointByPointScorekeeper}
                    >
                      📱 Point-by-Point Scorekeeper
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={addSet} disabled={sets.length >= 3}>
                      <Plus size={15} aria-hidden="true" />
                      Add set
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-[#0b1322] shadow-sm">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 font-semibold">Team / Players</th>
                        {sets.map((_, idx) => (
                          <th key={idx} className="w-24 px-4 py-3 text-center font-semibold">
                            <div className="flex items-center justify-center gap-1.5">
                              <span>Set {idx + 1}</span>
                              {sets.length > 1 && idx === sets.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(idx)}
                                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-red-600 transition-colors"
                                  title="Remove set"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Row 1: Team 1 */}
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Team 1</span>
                        </td>
                        {sets.map((set, idx) => (
                          <td key={idx} className="w-24 px-4 py-2 text-center">
                            <Input
                              type="number"
                              className="mx-auto h-10 min-h-10 w-20 text-center font-semibold text-base focus:border-emerald-500 focus:ring-emerald-500/15"
                              placeholder="0"
                              value={set.team1}
                              onChange={(e) => updateScoreSet(idx, 'team1', e.target.value)}
                              min={0}
                            />
                          </td>
                        ))}
                      </tr>
                      {/* Row 2: Team 2 */}
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <span className="text-xs font-bold uppercase tracking-wide text-indigo-700">Team 2</span>
                        </td>
                        {sets.map((set, idx) => (
                          <td key={idx} className="w-24 px-4 py-2 text-center">
                            <Input
                              type="number"
                              className="mx-auto h-10 min-h-10 w-20 text-center font-semibold text-base focus:border-indigo-500 focus:ring-indigo-500/15"
                              placeholder="0"
                              value={set.team2}
                              onChange={(e) => updateScoreSet(idx, 'team2', e.target.value)}
                              min={0}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Score validation errors */}
                <div className="space-y-1">
                  {sets.map((_, index) => {
                    const setNumber = index + 1
                    const setError = errors[`set${setNumber}`] || errors[`set${setNumber}Team1`] || errors[`set${setNumber}Team2`]
                    if (!setError) return null
                    return (
                      <p key={setNumber} className="text-xs font-medium text-red-600">
                        Set {setNumber}: {setError}
                      </p>
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
      
      {showCelebration && (
        <>
          <CelebrationConfetti />
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => {
            if (celebrationTimerRef.current) {
              clearTimeout(celebrationTimerRef.current)
            }
            setShowCelebration(false)
            onClose()
            onScoreRecorded?.()
          }}>
            <Card className="mx-4 w-full max-w-sm rounded-2xl bg-[#0b1322] p-6 text-center shadow-2xl border-t-4 border-emerald-500 transform scale-100 transition-all duration-300" onClick={(e) => e.stopPropagation()}>
              <CardContent className="space-y-4 pt-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl animate-bounce">
                  👑
                </div>
                <h3 className="text-xl font-black text-slate-900">Match Recorded!</h3>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Winners</p>
                <h2 className="text-2xl font-extrabold text-slate-950 leading-tight">
                  {celebrationWinners}
                </h2>
                <div className="text-xs font-bold text-slate-500">
                  Score: {celebrationScore}
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    fullWidth
                    onClick={() => {
                      if (celebrationTimerRef.current) {
                        clearTimeout(celebrationTimerRef.current)
                      }
                      setShowCelebration(false)
                      onClose()
                      onScoreRecorded?.()
                    }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
                  >
                    Awesome! 🎉
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {showScorekeeper && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-xs">
                  Ref
                </span>
                Point-by-Point Scorekeeper
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                {clubName ? `${clubName} • ` : ''}
                {matchType === 'doubles' ? 'Doubles' : 'Singles'} • Set {currentSetIdx + 1}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Discard current live scoring progress?')) {
                  setShowScorekeeper(false)
                }
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sets Tracker Header */}
          <div className="flex justify-center gap-3 border-b border-slate-800 bg-slate-900/35 py-3">
            {[0, 1, 2].map((idx) => {
              const setScore = refereeSets[idx]
              const isActive = idx === currentSetIdx
              const isFuture = idx >= refereeSets.length
              
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center rounded-lg px-4 py-1.5 transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold scale-105 shadow shadow-emerald-500/5'
                      : isFuture
                        ? 'border border-transparent text-slate-600 font-medium'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">Set {idx + 1}</span>
                  <span className="text-sm font-mono mt-0.5">
                    {isFuture ? '-' : `${setScore.team1} - ${setScore.team2}`}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Main Scoring Area */}
          <div className="flex flex-1 flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Team 1 Score Area */}
            <button
              type="button"
              disabled={isMatchFinished}
              onClick={() => handleScorePoint(1)}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center transition-all bg-orange-950/5 hover:bg-orange-950/10 active:bg-orange-950/25 group focus:outline-none cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-2 group-hover:scale-105 transition-transform">
                {team1Name}
              </span>
              <div className="text-8xl md:text-9xl font-black font-mono text-orange-500 tracking-tighter select-none animate-in zoom-in duration-150">
                {refereeSets[currentSetIdx]?.team1 ?? 0}
              </div>
              <span className="mt-4 text-xs font-medium text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                {isMatchFinished ? 'Match finished' : 'Tap to score point'}
              </span>
            </button>

            {/* Team 2 Score Area */}
            <button
              type="button"
              disabled={isMatchFinished}
              onClick={() => handleScorePoint(2)}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center transition-all bg-emerald-950/5 hover:bg-emerald-950/10 active:bg-emerald-950/25 group focus:outline-none cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                {team2Name}
              </span>
              <div className="text-8xl md:text-9xl font-black font-mono text-emerald-400 tracking-tighter select-none animate-in zoom-in duration-150">
                {refereeSets[currentSetIdx]?.team2 ?? 0}
              </div>
              <span className="mt-4 text-xs font-medium text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                {isMatchFinished ? 'Match finished' : 'Tap to score point'}
              </span>
            </button>
          </div>

          {/* Winner announcement / Match controls */}
          {isMatchFinished && (
            <div className="bg-emerald-950/25 border-y border-emerald-800/40 p-4 text-center animate-in slide-in-from-bottom duration-300">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-xl mb-2">
                👑
              </div>
              <h4 className="text-md font-extrabold text-emerald-400">
                Match Complete!
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {matchWinner === 1 ? team1Name : team2Name} wins the match.
              </p>
            </div>
          )}

          {/* Bottom Area: Controls & Timeline */}
          <div className="border-t border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row gap-4">
            {/* Timeline */}
            <div className="flex-1 flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Trophy size={11} /> Point Timeline
              </span>
              <div className="h-28 overflow-y-auto bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs font-mono space-y-1.5">
                {refereeLogs.length === 0 ? (
                  <span className="text-slate-600 italic block py-0.5">No points scored yet. Tap above to begin refereeing.</span>
                ) : (
                  refereeLogs.map((log, logIdx) => (
                    <div
                      key={logIdx}
                      className={`py-0.5 border-b border-slate-900 last:border-b-0 ${
                        log.includes('🏆')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('🎉')
                            ? 'text-yellow-400 font-extrabold'
                            : 'text-slate-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row md:flex-col justify-end gap-2.5 shrink-0 min-w-[180px]">
              <Button
                type="button"
                variant="secondary"
                onClick={handleUndo}
                disabled={refereeHistory.length === 0}
                className="flex-1 md:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 border-none h-11"
              >
                <RotateCcw size={16} />
                Undo Point
              </Button>
              <Button
                type="button"
                onClick={applyRefereeScores}
                className="flex-1 md:flex-initial bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-11 shadow-lg"
              >
                Apply & Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
