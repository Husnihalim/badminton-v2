import { useState } from 'react'
import { X, Search, MessageCircle, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { createFriendly } from '../../lib/friendlyApi'
import type { Club } from '../../types'

interface FriendlyCreateModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  nearbyClubs?: Club[]
  onCreated?: (inviteCode: string) => void
}

export function FriendlyCreateModal({
  isOpen,
  onClose,
  clubId,
  nearbyClubs = [],
  onCreated,
}: FriendlyCreateModalProps) {
  const [step, setStep] = useState<'select' | 'invite' | 'confirm'>('select')
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [newClubName, setNewClubName] = useState('')
  const [newClubContact, setNewClubContact] = useState('')
  const [pairCount, setPairCount] = useState<4 | 5>(5)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelectClub = (club: Club) => {
    setSelectedClub(club)
    setNewClubName('')
    setNewClubContact('')
    setStep('confirm')
  }

  const handleSelectNewClub = () => {
    setSelectedClub(null)
    setStep('confirm')
  }

  const handleCreate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { friendly, error } = await createFriendly(
        clubId,
        selectedClub?.name || newClubName,
        pairCount,
        newClubContact || undefined,
        selectedClub?.id
      )

      if (error) throw error

      setInviteCode(friendly.invite_code)
      setStep('invite')
      onCreated?.(friendly.invite_code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create friendly')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareWhatsApp = () => {
    const message = `🏸 *Friendly Challenge*\n\nWe challenge you to a Friendly match on KelabSukan!\n\n${pairCount} pairs • 1 set each\nWinner takes the bragging rights\n\nTap to accept:\n${window.location.origin}/f/${inviteCode}`
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${inviteCode}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-lg border-white/10 bg-[#0a0f0e]">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="arena-heading text-xl">
              {step === 'select' && 'Challenge Club to Friendly'}
              {step === 'confirm' && 'Confirm Challenge'}
              {step === 'invite' && 'Share Challenge'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Step 1: Select Club */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search clubs..."
                  className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Nearby Clubs */}
              {nearbyClubs.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nearby Clubs
                  </p>
                  <div className="space-y-2">
                    {nearbyClubs.map((club) => (
                      <button
                        key={club.id}
                        onClick={() => handleSelectClub(club)}
                        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-[var(--arena-lime)] hover:bg-white/10"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
                          🏸
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white">{club.name}</p>
                          <p className="text-xs text-slate-400">
                            {club.city} • {club.membersCount || 0} members
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0a0f0e] px-4 text-xs text-slate-500">OR</span>
                </div>
              </div>

              {/* New Club */}
              <button
                onClick={handleSelectNewClub}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-white/20 bg-white/5 p-4 text-left transition-colors hover:border-[var(--arena-lime)] hover:bg-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                  <MessageCircle size={20} className="text-[var(--arena-lime)]" />
                </div>
                <div>
                  <p className="font-bold text-white">Club not on KelabSukan?</p>
                  <p className="text-xs text-slate-400">Invite them to join and play</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Confirm Details */}
          {step === 'confirm' && (
            <div className="space-y-6">
              {/* Selected Club */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Challenging
                </p>
                {selectedClub ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-2xl">
                      🏸
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{selectedClub.name}</p>
                      <p className="text-sm text-slate-400">{selectedClub.city}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Club name (e.g., Shuttle Masters)"
                      value={newClubName}
                      onChange={(e) => setNewClubName(e.target.value)}
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    />
                    <Input
                      placeholder="Contact (WhatsApp/Phone)"
                      value={newClubContact}
                      onChange={(e) => setNewClubContact(e.target.value)}
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    />
                  </div>
                )}
              </div>

              {/* Pair Count */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Number of Pairs
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPairCount(4)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition-colors ${
                      pairCount === 4
                        ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <Users size={18} />
                    <span className="font-bold">4 pairs</span>
                  </button>
                  <button
                    onClick={() => setPairCount(5)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition-colors ${
                      pairCount === 5
                        ? 'border-[var(--arena-lime)] bg-[var(--arena-lime)]/10 text-[var(--arena-lime)]'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <Users size={18} />
                    <span className="font-bold">5 pairs</span>
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('select')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isLoading || (!selectedClub && !newClubName)}
                  className="flex-1 bg-[var(--arena-lime)] text-black hover:bg-[var(--arena-lime)]/90"
                >
                  {isLoading ? 'Creating...' : 'Create Challenge'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Share Invite */}
          {step === 'invite' && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="live">Challenge</Badge>
                </div>
                <p className="mb-2 text-lg font-bold text-white">
                  🏸 {nearbyClubs.find(c => c.id === clubId)?.name || 'Your Club'}
                </p>
                <p className="mb-4 text-slate-300">
                  We challenge you to a Friendly match on KelabSukan!
                </p>
                <div className="space-y-1 text-sm text-slate-400">
                  <p>• {pairCount} pairs • 1 set each</p>
                  <p>• Winner takes the bragging rights</p>
                </div>
                <div className="mt-4 rounded bg-slate-900 p-2 text-center text-sm text-slate-400">
                  {window.location.origin}/f/{inviteCode}
                </div>
              </div>

              {/* Share Actions */}
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  <MessageCircle size={18} />
                  Share to WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyLink}
                  className="w-full border-white/10"
                >
                  Copy Link
                </Button>
              </div>

              {/* Done */}
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full"
              >
                I'll share later
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
