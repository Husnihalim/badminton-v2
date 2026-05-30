import { useState } from 'react'
import { sampleClubs, sampleMembers } from '../data/mock'

interface ScoreRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  clubId?: string
}

type PlayerField = {
  memberId: string
  customName: string
}

function createPlayerField(): PlayerField {
  return { memberId: '', customName: '' }
}

function getPlayerName(field: PlayerField): string {
  if (field.customName.trim()) return field.customName.trim()
  if (field.memberId) {
    const member = sampleMembers.find((m) => m.id === field.memberId)
    if (member) return member.name
  }
  return ''
}

function isPlayerValid(field: PlayerField): boolean {
  return Boolean(getPlayerName(field))
}

export default function ScoreRecordingModal({ isOpen, onClose, clubId }: ScoreRecordingModalProps) {
  const [matchTitle, setMatchTitle] = useState('')
  const [sport, setSport] = useState('badminton')
  const [matchType, setMatchType] = useState('singles')
  const [selectedClubId, setSelectedClubId] = useState<string>(clubId ?? sampleClubs[0]?.id ?? '')
  const [player1A, setPlayer1A] = useState<PlayerField>(createPlayerField())
  const [player1B, setPlayer1B] = useState<PlayerField>(createPlayerField())
  const [player2A, setPlayer2A] = useState<PlayerField>(createPlayerField())
  const [player2B, setPlayer2B] = useState<PlayerField>(createPlayerField())
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const selectedClub = clubId ? sampleClubs.find((c) => c.id === clubId) : sampleClubs.find((c) => c.id === selectedClubId)
  const clubs = sampleClubs

  // Filter members by selected club (fallback to all for demo)
  const availableMembers = sampleMembers

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}

    if (!matchTitle.trim()) {
      nextErrors.matchTitle = 'Match title is required.'
    }

    if (!isPlayerValid(player1A)) nextErrors.player1A = 'Player 1 is required.'
    if (!isPlayerValid(player2A)) nextErrors.player2A = 'Player 2 is required.'

    if (matchType === 'doubles') {
      if (!isPlayerValid(player1B)) nextErrors.player1B = 'Team 1 Player 2 is required.'
      if (!isPlayerValid(player2B)) nextErrors.player2B = 'Team 2 Player 2 is required.'
    }

    const s1 = Number(score1)
    const s2 = Number(score2)
    if (score1 === '' || Number.isNaN(s1) || s1 < 0) {
      nextErrors.score1 = 'Enter a valid score.'
    }
    if (score2 === '' || Number.isNaN(s2) || s2 < 0) {
      nextErrors.score2 = 'Enter a valid score.'
    }

    // Check for duplicate players
    const names = [
      getPlayerName(player1A),
      matchType === 'doubles' ? getPlayerName(player1B) : null,
      getPlayerName(player2A),
      matchType === 'doubles' ? getPlayerName(player2B) : null,
    ].filter(Boolean) as string[]
    if (new Set(names).size !== names.length) {
      nextErrors.duplicate = 'Each player must be unique.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const teamA = matchType === 'doubles'
      ? `${getPlayerName(player1A)} + ${getPlayerName(player1B)}`
      : getPlayerName(player1A)
    const teamB = matchType === 'doubles'
      ? `${getPlayerName(player2A)} + ${getPlayerName(player2B)}`
      : getPlayerName(player2A)

    showToast(`Score recorded: ${teamA} ${score1}-${score2} ${teamB}`)

    // Reset form
    setMatchTitle('')
    setScore1('')
    setScore2('')
    setPlayer1A(createPlayerField())
    setPlayer1B(createPlayerField())
    setPlayer2A(createPlayerField())
    setPlayer2B(createPlayerField())
    setErrors({})
    onClose()
  }

  const renderPlayerField = (
    label: string,
    field: PlayerField,
    setField: (f: PlayerField) => void,
    errorKey: string,
  ) => (
    <div className="modal-form-group">
      <label>{label}</label>
      <select
        value={field.memberId}
        onChange={(e) => setField({ ...field, memberId: e.target.value })}
        className="form-input"
      >
        <option value="">Select member</option>
        {availableMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Or enter custom name"
        value={field.customName}
        onChange={(e) => setField({ ...field, customName: e.target.value })}
        className="form-input"
        style={{ marginTop: '8px' }}
      />
      {errors[errorKey] && (
        <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>{errors[errorKey]}</p>
      )}
    </div>
  )

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
          <h2>Record match score</h2>
          <form onSubmit={handleSubmit} noValidate>
            {/* Club selection */}
            {!clubId ? (
              <div className="modal-form-group">
                <label>Club</label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="form-input"
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="modal-form-group">
                <label>Club</label>
                <div className="modal-readonly-field">{selectedClub?.name ?? 'Selected club'}</div>
              </div>
            )}

            {/* Sport selection */}
            <div className="modal-form-group">
              <label>Sport</label>
              <select value={sport} onChange={(e) => setSport(e.target.value)} className="form-input">
                <option value="badminton">Badminton</option>
                <option value="tennis">Tennis</option>
                <option value="squash">Squash</option>
                <option value="pickleball">Pickleball</option>
                <option value="table tennis">Table tennis</option>
                <option value="racquetball">Racquetball</option>
              </select>
            </div>

            {/* Match type */}
            <div className="modal-form-group">
              <label>Match type</label>
              <div className="modal-radio-group">
                <label>
                  <input
                    type="radio"
                    value="singles"
                    checked={matchType === 'singles'}
                    onChange={() => {
                      setMatchType('singles')
                      setPlayer1B(createPlayerField())
                      setPlayer2B(createPlayerField())
                    }}
                  />
                  Singles
                </label>
                <label>
                  <input
                    type="radio"
                    value="doubles"
                    checked={matchType === 'doubles'}
                    onChange={() => setMatchType('doubles')}
                  />
                  Doubles
                </label>
              </div>
            </div>

            {/* Match title */}
            <div className="modal-form-group">
              <label>Match title</label>
              <input
                type="text"
                placeholder="e.g., Monday Singles Game"
                value={matchTitle}
                onChange={(e) => setMatchTitle(e.target.value)}
                className="form-input"
              />
              {errors.matchTitle && (
                <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>{errors.matchTitle}</p>
              )}
            </div>

            {/* Players */}
            {matchType === 'singles' ? (
              <>
                {renderPlayerField('Player 1', player1A, setPlayer1A, 'player1A')}
                {renderPlayerField('Player 2', player2A, setPlayer2A, 'player2A')}
              </>
            ) : (
              <div className="modal-player-grid">
                {renderPlayerField('Team 1, Player 1', player1A, setPlayer1A, 'player1A')}
                {renderPlayerField('Team 1, Player 2', player1B, setPlayer1B, 'player1B')}
                {renderPlayerField('Team 2, Player 1', player2A, setPlayer2A, 'player2A')}
                {renderPlayerField('Team 2, Player 2', player2B, setPlayer2B, 'player2B')}
              </div>
            )}

            {errors.duplicate && (
              <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{errors.duplicate}</p>
            )}

            {/* Score */}
            <div className="modal-form-group">
              <label>Score</label>
              <div className="modal-score-row">
                <input
                  type="number"
                  placeholder="Team 1"
                  value={score1}
                  onChange={(e) => setScore1(e.target.value)}
                  min={0}
                />
                <span className="modal-score-divider">-</span>
                <input
                  type="number"
                  placeholder="Team 2"
                  value={score2}
                  onChange={(e) => setScore2(e.target.value)}
                  min={0}
                />
              </div>
              {(errors.score1 || errors.score2) && (
                <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.score1 || errors.score2}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="modal-actions">
              <button type="button" className="small-button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="brand-button">
                Record score
              </button>
            </div>
          </form>
        </div>
      </div>
      {toast && <div className="modal-toast">{toast}</div>}
    </>
  )
}
