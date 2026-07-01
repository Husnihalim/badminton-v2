import { useState } from 'react'
import { Check, DollarSign } from 'lucide-react'
import { useClubMembers, useEventRsvps } from '../hooks/useClubQueries'
import { useAdminUpdateEventRsvp } from '../../hooks/useMutations'
import { THEME_MAP } from '../constants'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import type { ClubEvent, EventRsvp } from '../../../types'

interface EventRsvpManagementDrawerProps {
  event: ClubEvent
  clubId: string
  accentColor?: string
}

export function EventRsvpManagementDrawer({ event, clubId, accentColor = 'emerald' }: EventRsvpManagementDrawerProps) {
  const [rsvpSearchQuery, setRsvpSearchQuery] = useState('')
  const { data: members = [] } = useClubMembers(clubId)
  const { data: eventRsvps = [] } = useEventRsvps(event.id)

  const adminUpdateRsvp = useAdminUpdateEventRsvp()

  const theme = THEME_MAP[accentColor] || THEME_MAP.emerald

  // Attendance and collection stats
  const attendedCount = eventRsvps.filter((r) => r.attended).length
  const paidCount = eventRsvps.filter((r) => r.paid).length
  const cost = event.cost_amount ? Number(event.cost_amount) : 0
  const collectedAmount = paidCount * cost
  const expectedAmount = attendedCount * cost

  const filteredMembers = members
    .filter((m) => m.status === 'active')
    .filter((m) => {
      if (!rsvpSearchQuery) return true
      return (m.name || '').toLowerCase().includes(rsvpSearchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const rsvpA = eventRsvps.find((r) => r.user_id === a.user_id)
      const rsvpB = eventRsvps.find((r) => r.user_id === b.user_id)
      
      // Sort: Attended first, then RSVP status (Going first, then Maybe, then none, then Not Going)
      if (rsvpA?.attended && !rsvpB?.attended) return -1
      if (!rsvpA?.attended && rsvpB?.attended) return 1

      const statusA = rsvpA?.status || 'no_response'
      const statusB = rsvpB?.status || 'no_response'
      
      const getWeight = (status: string) => {
        if (status === 'going') return 0
        if (status === 'maybe') return 1
        if (status === 'no_response') return 2
        return 3
      }
      
      return getWeight(statusA) - getWeight(statusB)
    })

  const handleAdminRsvpUpdate = async (
    userId: string,
    status: EventRsvp['status'],
    attended?: boolean,
    paid?: boolean
  ) => {
    try {
      await adminUpdateRsvp.mutateAsync({
        eventId: event.id,
        userId,
        status,
        attended,
        paid,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update member attendance/payment')
    }
  }

  return (
    <div className="mt-2.5 p-3.5 bg-[var(--arena-surface-muted)] rounded-lg border border-[var(--arena-border)] space-y-3">
      <div className="flex flex-col gap-1.5">
        <h4 className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase tracking-wider">
          Admin Control: Attendance & Payment
        </h4>
        
        {/* Summary Stats Panel */}
        <div className="p-2.5 bg-[var(--arena-surface)] rounded-md border border-[var(--arena-border)]/80 text-[11px] font-medium text-[var(--arena-text-muted)] grid grid-cols-2 gap-2 shadow-sm">
          <div>
            📊 <span className="font-bold text-[var(--arena-text)]">Attended:</span> {attendedCount}
          </div>
          <div>
            💰 <span className="font-bold text-[var(--arena-text)]">Paid:</span> {paidCount}
          </div>
          {cost > 0 && (
            <div className="col-span-2 border-t border-[var(--arena-border)] pt-1.5 mt-0.5 flex justify-between items-center text-xs">
              <span>💵 <span className="font-bold text-[var(--arena-text)]">Revenue:</span></span>
              <span className={`font-bold ${theme.text}`}>RM {collectedAmount.toFixed(2)} / RM {expectedAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search members..."
          value={rsvpSearchQuery}
          onChange={(e) => setRsvpSearchQuery(e.target.value)}
          className="min-h-9 text-xs flex-1 bg-[var(--arena-surface)] border-[var(--arena-border)] focus:border-[var(--arena-accent)] focus:ring-1 focus:ring-[var(--arena-accent)]/20"
        />
        {rsvpSearchQuery && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setRsvpSearchQuery('')}
            className="min-h-9 px-3 text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Member Attendance List */}
      <div className="divide-y divide-[var(--arena-border)] max-h-60 overflow-y-auto pr-0.5 space-y-1">
        {filteredMembers.length ? (
          filteredMembers.map((member) => {
            const rsvp = eventRsvps.find((r) => r.user_id === member.user_id)
            const rsvpStatus = rsvp?.status || 'no_response'
            
            // Check if this specific user is mutating
            const isLoadingThis = adminUpdateRsvp.isPending && 
              adminUpdateRsvp.variables?.userId === member.user_id &&
              adminUpdateRsvp.variables?.eventId === event.id

            return (
              <Card key={member.user_id} className="flex items-center justify-between py-2 text-xs gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 shrink-0 rounded-full ${theme.bg} text-[var(--arena-accent-text)] flex items-center justify-center font-bold text-[10px] uppercase shadow-sm`}>
                    {member.name ? member.name.slice(0, 2).toUpperCase() : 'M'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[var(--arena-text)] truncate">{member.name || 'Anonymous'}</span>
                    <span className="text-[9px] text-[var(--arena-text-dim)] capitalize">{member.role}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {isLoadingThis ? (
                    <span className="text-[9px] text-[var(--arena-text-dim)] px-2 py-1 font-medium animate-pulse">Syncing...</span>
                  ) : (
                    <>
                      {/* RSVP Select */}
                      <select
                        value={rsvpStatus}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'going' || val === 'maybe' || val === 'not_going') {
                            handleAdminRsvpUpdate(member.user_id, val, rsvp?.attended, rsvp?.paid)
                          }
                        }}
                        className={`h-7 min-h-7 text-[10px] py-0.5 px-1 border border-[var(--arena-border)] rounded-md w-20 font-bold bg-[var(--arena-surface)] text-[var(--arena-text-muted)] shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--arena-accent)]`}
                      >
                        {rsvpStatus === 'no_response' && <option value="no_response">Pending</option>}
                        <option value="going">Going</option>
                        <option value="maybe">Maybe</option>
                        <option value="not_going">No</option>
                      </select>

                      {/* Attended Toggle */}
                      <button
                        type="button"
                        className={`h-7 px-2 rounded-md text-[10px] font-extrabold border flex items-center gap-1 transition-all shadow-sm ${
                          rsvp?.attended
                            ? `${theme.bg} ${theme.border} text-[var(--arena-accent-text)]`
                            : 'bg-[var(--arena-surface)] text-[var(--arena-text-muted)] border-[var(--arena-border)] hover:bg-[var(--arena-surface-muted)]'
                        }`}
                        onClick={() => handleAdminRsvpUpdate(
                          member.user_id,
                          rsvpStatus === 'no_response' ? 'going' : rsvpStatus,
                          !rsvp?.attended,
                          rsvp?.paid
                        )}
                        title="Attended"
                      >
                        <Check size={11} strokeWidth={3} className={rsvp?.attended ? '' : 'text-[var(--arena-text-dim)]'} />
                        <span className="hidden sm:inline">Attended</span>
                      </button>

                      {/* Paid Toggle */}
                      <button
                        type="button"
                        className={`h-7 px-2 rounded-md text-[10px] font-extrabold border flex items-center gap-1 transition-all shadow-sm ${
                          rsvp?.paid
                            ? 'bg-warning border-warning text-warning-text'
                            : 'bg-[var(--arena-surface)] text-[var(--arena-text-muted)] border-[var(--arena-border)] hover:bg-[var(--arena-surface-muted)]'
                        }`}
                        onClick={() => handleAdminRsvpUpdate(
                          member.user_id,
                          rsvpStatus === 'no_response' ? 'going' : rsvpStatus,
                          rsvp?.attended,
                          !rsvp?.paid
                        )}
                        title="Paid"
                      >
                        <DollarSign size={10} className={rsvp?.paid ? '' : 'text-[var(--arena-text-dim)]'} />
                        <span className="hidden sm:inline">Paid</span>
                      </button>
                    </>
                  )}
                </div>
              </Card>
            )
          })
        ) : (
          <div className="text-center py-4 text-xs text-[var(--arena-text-dim)] italic">
            No members match search.
          </div>
        )}
      </div>
    </div>
  )
}
