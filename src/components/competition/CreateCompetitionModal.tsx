import { useState } from 'react'
import { X, Search, ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { createCompetition } from '../../lib/api/competitions'
import type { CompetitionFormat } from '../../types/competition'
import type { Club } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  myClubId: string
  myClubName: string
  allClubs?: Club[]
  onCreated?: (competitionId: string) => void
}

type Step = 'type' | 'clubs' | 'format' | 'confirm'

export function CreateCompetitionModal({ isOpen, onClose, myClubId, myClubName, allClubs = [], onCreated }: Props) {
  const [step, setStep] = useState<Step>('type')
  const [format, setFormat] = useState<CompetitionFormat | null>(null)
  const [selectedClubs, setSelectedClubs] = useState<Club[]>([])
  const [pairsCount, setPairsCount] = useState(5)
  const [setsCount, setSetsCount] = useState<1 | 3>(1)
  const [pointsPerSet, setPointsPerSet] = useState<15 | 21 | 31>(21)
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [rosterMode, setRosterMode] = useState<'admin' | 'open'>('admin')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  if (!isOpen) return null

  const availableClubs = allClubs.filter(c => c.id !== myClubId && !selectedClubs.some(s => s.id === c.id))
  const filteredClubs = availableClubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )
  const reset = () => {
    setStep('type')
    setFormat(null)
    setSelectedClubs([])
    setPairsCount(5)
    setSetsCount(1)
    setPointsPerSet(21)
    setLocation('')
    setDate('')
    setRosterMode('admin')
    setSearch('')
    setIsLoading(false)
    setError(null)
    setCreatedId(null)
  }

  const handleCreate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createCompetition({
        clubId: myClubId,
        myClubName,
        title: `${myClubName} vs ${selectedClubs.map(c => c.name).join(', ')}`,
        sport: 'badminton',
        format: format || 'friendly',
        opponentClubIds: selectedClubs.map(c => c.id),
        pairsCount,
        setsCount,
        pointsPerSet,
        location: location || undefined,
        startDate: date || undefined,
        rosterMode,
      })

      if (result.error) throw result.error
      if (!result.competition) throw new Error('Failed to create competition')

      setCreatedId(result.competition.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
      <Card className="max-h-[92svh] w-full overflow-y-auto rounded-b-none rounded-t-xl border-white/10 bg-[var(--arena-surface)] sm:max-w-lg sm:rounded-xl">
        <CardContent className="p-4 sm:p-6">

          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== 'type' && (
                <button onClick={() => setStep('type')} className="rounded-full p-1 text-slate-400 hover:text-white">
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="text-lg font-bold text-white">
                {step === 'type' && 'New Competition'}
                {step === 'clubs' && 'Select Clubs'}
                {step === 'format' && 'Format Settings'}
                {step === 'confirm' && 'Review & Create'}
              </h2>
            </div>
            <button onClick={() => { reset(); onClose() }} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-1.5">
            {['type', 'clubs', 'format', 'confirm'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === s ? 'bg-[var(--arena-lime)] text-black' :
                  ['type', 'clubs', 'format', 'confirm'].indexOf(step) > i ? 'bg-green-600 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {['type', 'clubs', 'format', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 3 && <div className={`h-0.5 w-6 ${['type', 'clubs', 'format', 'confirm'].indexOf(step) > i ? 'bg-green-600' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Type */}
          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">What kind of competition?</p>
              <button
                onClick={() => { setFormat('friendly'); setStep('clubs') }}
                className="flex w-full items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-[var(--arena-lime)] hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/50 text-xl">🤝</div>
                <div>
                  <p className="text-base font-bold text-white">Friendly</p>
                  <p className="text-sm text-slate-400">Your club vs one other club</p>
                </div>
              </button>
              <button
                onClick={() => { setFormat('league'); setStep('clubs') }}
                className="flex w-full items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-[var(--arena-lime)] hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-900/50 text-xl">🏆</div>
                <div>
                  <p className="text-base font-bold text-white">League</p>
                  <p className="text-sm text-slate-400">Three or more clubs, round-robin</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Clubs */}
          {step === 'clubs' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                {format === 'friendly' ? 'Pick your opponent' : 'Pick 2 or more clubs'}
              </p>

              {/* Selected */}
              {selectedClubs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-500">Selected ({selectedClubs.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedClubs.map(club => (
                      <button
                        key={club.id}
                        onClick={() => setSelectedClubs(prev => prev.filter(c => c.id !== club.id))}
                        className="flex items-center gap-2 rounded-full border border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 px-3 py-1.5 text-sm text-[var(--arena-lime)]"
                      >
                        {club.name} ✕
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search clubs..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Club list */}
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {filteredClubs.map(club => (
                  <button
                    key={club.id}
                    onClick={() => setSelectedClubs(prev => [...prev, club])}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-[var(--arena-lime)] hover:bg-white/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg">🏸</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">{club.name}</p>
                      <p className="text-xs text-slate-400">{club.city} • {club.membersCount || 0} members</p>
                    </div>
                  </button>
                ))}
                {filteredClubs.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">No clubs found</p>
                )}
              </div>

              <Button
                onClick={() => setStep('format')}
                disabled={selectedClubs.length < (format === 'league' ? 2 : 1)}
                className="w-full bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
              >
                Next: Format Settings
              </Button>
            </div>
          )}

          {/* Step 3: Format */}
          {step === 'format' && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Number of Pairs</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPairsCount(Math.max(1, pairsCount - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">−</button>
                  <span className="min-w-[3ch] text-center text-2xl font-bold text-white">{pairsCount}</span>
                  <button onClick={() => setPairsCount(Math.min(7, pairsCount + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">+</button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Sets per Match</p>
                <div className="flex gap-3">
                  {[1, 3].map(n => (
                    <button key={n} onClick={() => setSetsCount(n as 1 | 3)}
                      className={`flex-1 rounded-lg border p-3 text-center font-bold transition-colors ${
                        setsCount === n ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]' : 'border-white/10 bg-white/5 text-slate-400'
                      }`}>{n === 1 ? '1 Set' : 'Best of 3'}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Points per Set</p>
                <div className="flex gap-3">
                  {[15, 21, 31].map(n => (
                    <button key={n} onClick={() => setPointsPerSet(n as 15 | 21 | 31)}
                      className={`flex-1 rounded-lg border p-3 text-center font-bold transition-colors ${
                        pointsPerSet === n ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]' : 'border-white/10 bg-white/5 text-slate-400'
                      }`}>{n} pts</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">Date</p>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="border-white/10 bg-white/5 text-white [color-scheme:dark]" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">Venue</p>
                  <Input placeholder="e.g. KL Sports Arena" value={location} onChange={e => setLocation(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">How will players join?</p>
                <div className="flex gap-3">
                  <button onClick={() => setRosterMode('admin')}
                    className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                      rosterMode === 'admin' ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10' : 'border-white/10 bg-white/5'
                    }`}>
                    <p className="font-bold text-white">Admin Picks</p>
                    <p className="text-xs text-slate-400">You select players</p>
                  </button>
                  <button onClick={() => setRosterMode('open')}
                    className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                      rosterMode === 'open' ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10' : 'border-white/10 bg-white/5'
                    }`}>
                    <p className="font-bold text-white">Open to Members</p>
                    <p className="text-xs text-slate-400">Members volunteer</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => setStep('clubs')}>Back</Button>
                <Button onClick={() => setStep('confirm')} className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90">
                  Review
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && !createdId && (
            <div className="space-y-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-xs font-bold uppercase text-slate-500">Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type</span>
                    <span className="font-bold text-white">{format === 'friendly' ? '🤝 Friendly' : '🏆 League'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Opponents</span>
                    <span className="font-bold text-white">{selectedClubs.map(c => c.name).join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pairs</span>
                    <span className="font-bold text-white">{pairsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Format</span>
                    <span className="font-bold text-white">{setsCount === 1 ? '1 set' : 'Best of 3'} · {pointsPerSet} pts</span>
                  </div>
                  {location && <div className="flex justify-between">
                    <span className="text-slate-400">Venue</span>
                    <span className="font-bold text-white">{location}</span>
                  </div>}
                  {date && <div className="flex justify-between">
                    <span className="text-slate-400">Date</span>
                    <span className="font-bold text-white">{new Date(date).toLocaleDateString()}</span>
                  </div>}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rostering</span>
                    <span className="font-bold text-white">{rosterMode === 'admin' ? 'Admin picks' : 'Open to members'}</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => setStep('format')}>Back</Button>
                <Button onClick={handleCreate} disabled={isLoading}
                  className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90">
                  {isLoading ? 'Creating...' : 'Create Competition'}
                </Button>
              </div>
            </div>
          )}

          {/* Done */}
          {createdId && (
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/50">
                <Sparkles size={32} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Competition Created!</h3>
              <p className="text-sm text-slate-400">Clubs have been notified. They'll be invited to set up their lineups.</p>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => { reset(); onClose() }}>Close</Button>
                <Button onClick={() => { onCreated?.(createdId); onClose(); }}
                  className="bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90">
                  Go to Competition
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
