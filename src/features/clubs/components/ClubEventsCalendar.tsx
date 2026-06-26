import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, DollarSign, Share2, MessageCircle, Copy, ChevronLeft, ChevronRight, X, Users, Trophy, ClipboardPenLine } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useClub, useClubEvents, useMyMembership, useMyRsvps, useEventRsvps } from '../hooks/useClubQueries'
import { useRsvpToEvent, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../../hooks/useMutations'
import { THEME_MAP } from '../constants'
import { Card, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { EventRsvpManagementDrawer } from './EventRsvpManagementDrawer'
import { 
  buildEventShareUrl, 
  buildEventShareText,
} from '../../../lib/api'
import type { ClubEvent, EventRsvp } from '../../../types'

interface ClubEventsCalendarProps {
  clubId: string
  onRecordScoreForEvent: (event: ClubEvent) => void
  onViewHighlightsForEvent: (event: ClubEvent) => void
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
}

function formatEventCost(event: ClubEvent) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount = event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

function toDatetimeLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function getRsvpLabel(status: EventRsvp['status']) {
  if (status === 'going') return 'Accepted'
  if (status === 'maybe') return 'Holding'
  return 'Rejected'
}

// Inner Component for rendering an Event Card to keep queries scoped and modular
function EventCard({ 
  event, 
  clubId, 
  theme, 
  accentColor, 
  isAdmin, 
  isMember, 
  onRecordScore, 
  onViewHighlights, 
  setSuccessMessage, 
  setActionError,
  onEditEvent,
  onDeleteEvent
}: {
  event: ClubEvent
  clubId: string
  theme: typeof THEME_MAP[string]
  accentColor: string
  isAdmin: boolean
  isMember: boolean
  onRecordScore: (event: ClubEvent) => void
  onViewHighlights: (event: ClubEvent) => void
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
  onEditEvent: (event: ClubEvent) => void
  onDeleteEvent: (event: ClubEvent) => void
}) {
  const { user } = useAuth()
  const { data: eventRsvps = [] } = useEventRsvps(event.id)
  const { data: myRsvps = [] } = useMyRsvps(!!user)
  const rsvpMutation = useRsvpToEvent()

  const myRsvp = myRsvps.find((r) => r.event_id === event.id)
  const acceptedRsvps = eventRsvps.filter((r) => r.status === 'going')
  const holdingRsvps = eventRsvps.filter((r) => r.status === 'maybe')
  const rejectedRsvps = eventRsvps.filter((r) => r.status === 'not_going')
  const rsvpCount = acceptedRsvps.length
  const isFull = Boolean(event.max_participants && rsvpCount >= event.max_participants)
  const { data: club } = useClub(clubId)

  const eventShareText = buildEventShareText({ ...event, clubName: club?.name || '' })
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(eventShareText)}`

  const [showManageRsvp, setShowManageRsvp] = useState(false)

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user) return
    try {
      await rsvpMutation.mutateAsync({ eventId: event.id, status })
      setSuccessMessage(`RSVP updated: ${status.replace('_', ' ')}.`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to RSVP')
    }
  }

  const handleNativeEventShare = async () => {
    const shareUrl = buildEventShareUrl(event.id)
    if (!navigator.share) {
      await navigator.clipboard.writeText(shareUrl)
      setSuccessMessage('Game day link copied.')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    await navigator.share({
      title: event.title,
      text: eventShareText,
      url: shareUrl,
    })
  }

  const handleCopyEventShareLink = async () => {
    await navigator.clipboard.writeText(buildEventShareUrl(event.id))
    setSuccessMessage('Game day link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <div key={event.id} className="space-y-2.5 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-2.5">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="space-y-0.5">
          <h3 className="font-bold text-[var(--arena-text)] text-sm sm:text-base">{event.title}</h3>
          <p className="text-xs text-[var(--arena-text-muted)]">{new Date(event.event_date).toLocaleString()}</p>
          {event.location ? <p className="text-xs text-[var(--arena-text-muted)]">{event.location}</p> : null}
          {formatEventCost(event) ? (
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
              <DollarSign size={13} aria-hidden="true" />
              {formatEventCost(event)}
            </p>
          ) : null}
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => onEditEvent(event)} className="min-h-7 px-2 py-0.5 text-xs">
              Edit
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => onDeleteEvent(event)} className="min-h-7 px-2 py-0.5 text-xs">
              Delete
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'}>
            {event.signup_open ? 'Open' : 'Closed'}
          </Badge>
          {event.max_participants ? <Badge className="border-[var(--arena-border)] bg-[var(--arena-surface)] text-slate-300">{rsvpCount}/{event.max_participants} going</Badge> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="icon" variant="secondary" onClick={handleNativeEventShare} title="Share" className="h-7 w-7 min-h-0 rounded-full bg-[var(--arena-surface-elevated)] border-[var(--arena-border)]">
            <Share2 size={13} aria-hidden="true" />
          </Button>
          <a className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] text-[var(--arena-text)] hover:bg-[var(--arena-accent-soft)] hover:text-[var(--arena-accent)] hover:border-[var(--arena-accent)] transition-all" href={whatsappUrl} target="_blank" rel="noreferrer" title="Share via WhatsApp">
            <MessageCircle size={13} aria-hidden="true" />
          </a>
          <Button type="button" size="icon" variant="secondary" onClick={handleCopyEventShareLink} title="Copy link" className="h-7 w-7 min-h-0 rounded-full bg-[var(--arena-surface-elevated)] border-[var(--arena-border)]">
            <Copy size={13} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {isMember && event.signup_open ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['going', 'Accept'],
            ['maybe', 'Hold'],
            ['not_going', 'Reject'],
          ].map(([status, label]) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={myRsvp?.status === status ? 'primary' : 'secondary'}
              disabled={status === 'going' && isFull && myRsvp?.status !== 'going'}
              onClick={() => handleRsvp(status as 'going' | 'maybe' | 'not_going')}
              className="min-h-8 sm:min-h-9 text-xs"
            >
              {myRsvp?.status === status ? <Check size={13} aria-hidden="true" /> : null}
              {label}
            </Button>
          ))}
        </div>
      ) : null}
      {myRsvp ? (
        <p className="text-xs font-semibold text-[var(--arena-text-muted)]">Your response: {getRsvpLabel(myRsvp.status)}</p>
      ) : null}
      {isFull ? <p className="text-xs font-semibold text-red-600">Session full</p> : null}
      <div className="space-y-1.5 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] p-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={`border-${theme.borderLight} ${theme.bgLight} ${theme.textDark} text-[10px] px-1.5 py-0.5`}>{acceptedRsvps.length} accepted</Badge>
          <Badge className="border-amber-200 bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0.5">{holdingRsvps.length} holding</Badge>
          <Badge className="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-muted)] text-[10px] px-1.5 py-0.5">{rejectedRsvps.length} rejected</Badge>
        </div>
        {acceptedRsvps.length ? (
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs text-[var(--arena-text-muted)] pt-1">
            <span className="font-semibold shrink-0">Joining:</span>
            <div className="flex flex-wrap gap-1">
              {acceptedRsvps.map((r) => {
                const name = r.name || 'Member'
                const chip = (
                  <div className="inline-flex items-center gap-1 rounded bg-[var(--arena-surface-muted)] px-1.5 py-0.5 text-[11px] text-[var(--arena-text)] hover:bg-[var(--arena-accent-soft)] hover:text-[var(--arena-accent)] border border-[var(--arena-border)] transition-colors shrink-0">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ height: '16px', width: '16px' }} />
                    ) : (
                      <div className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full bg-slate-700 text-[8px] font-bold uppercase text-[var(--arena-text-muted)]">
                        {name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium max-w-[80px] truncate">{name}</span>
                  </div>
                )
                return r.user_id ? (
                  <Link key={r.id} to={`/member/${r.user_id}`} className="inline-flex shrink-0">
                    {chip}
                  </Link>
                ) : (
                  <div key={r.id} className="inline-flex shrink-0">
                    {chip}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--arena-text-dim)] pt-0.5">No accepted members yet.</p>
        )}
      </div>

      {/* Admin Attendance Management Panel */}
      {isAdmin && (
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full flex items-center justify-center gap-1.5 min-h-8 text-xs"
            onClick={() => setShowManageRsvp(!showManageRsvp)}
          >
            <Users size={13} aria-hidden="true" />
            {showManageRsvp ? 'Hide attendance settings' : 'Manage member RSVPs'}
          </Button>

          {showManageRsvp && (
            <EventRsvpManagementDrawer 
              event={event}
              clubId={clubId}
              accentColor={accentColor}
            />
          )}
        </div>
      )}

      {/* Session Highlights & Recording Buttons */}
      <div className={`grid gap-1.5 pt-1.5 border-t border-[var(--arena-border)] ${isMember ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Button
          type="button"
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-sm border-0 min-h-8 text-xs"
          onClick={() => onViewHighlights(event)}
        >
          <Trophy size={13} className="text-amber-100" />
          View Highlights
        </Button>
        {isMember ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="flex items-center justify-center gap-1.5 min-h-8 text-xs"
            onClick={() => onRecordScore(event)}
          >
            <ClipboardPenLine size={13} className="text-[var(--arena-text-muted)]" />
            Record Score
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function ClubEventsCalendar({
  clubId,
  onRecordScoreForEvent,
  onViewHighlightsForEvent,
  setSuccessMessage,
  setActionError
}: ClubEventsCalendarProps) {
  const { user } = useAuth()
  const { data: club } = useClub(clubId)
  const { data: events = [], isLoading: eventsLoading } = useClubEvents(clubId)
  const { data: myMembership } = useMyMembership(clubId, !!user)

  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent(clubId)
  const deleteEventMutation = useDeleteEvent()

  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  // Create/Edit Event Modal State
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventCostAmount, setEventCostAmount] = useState('')
  const [eventCostNote, setEventCostNote] = useState('')
  const [nowTimestamp] = useState(() => Date.now())

  if (!club) return null

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = myMembership?.status === 'active' || user?.role === 'superadmin'
  const accent = club.accent_color || 'emerald'
  const theme = THEME_MAP[accent] || THEME_MAP.emerald

  // Calendar calculations
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  }

  const calendarYear = calendarDate.getFullYear()
  const calendarMonth = calendarDate.getMonth()
  const calendarFirstDay = new Date(calendarYear, calendarMonth, 1)
  const calendarStartDayOfWeek = calendarFirstDay.getDay()
  const calendarTotalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calendarPrevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate()

  const calendarCells = []
  // Prev month padding
  for (let i = calendarStartDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      day: calendarPrevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(calendarYear, calendarMonth - 1, calendarPrevMonthDays - i),
    })
  }
  // Current month days
  for (let i = 1; i <= calendarTotalDays; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(calendarYear, calendarMonth, i),
    })
  }
  // Next month padding to complete grid
  const calendarTotalCells = Math.ceil(calendarCells.length / 7) * 7
  const calendarNextMonthPadding = calendarTotalCells - calendarCells.length
  for (let i = 1; i <= calendarNextMonthPadding; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(calendarYear, calendarMonth + 1, i),
    })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eDate = new Date(event.event_date)
      return (
        eDate.getDate() === date.getDate() &&
        eDate.getMonth() === date.getMonth() &&
        eDate.getFullYear() === date.getFullYear()
      )
    })
  }



  const openEditEventModal = (event: ClubEvent) => {
    setEditingEvent(event)
    setEventTitle(event.title)
    setEventDate(toDatetimeLocal(event.event_date))
    setEventLocation(event.location || '')
    setEventCostAmount(event.cost_amount != null ? String(event.cost_amount) : '')
    setEventCostNote(event.cost_note || '')
    setShowEventModal(true)
  }

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        title: eventTitle,
        event_date: new Date(eventDate).toISOString(),
        location: eventLocation.trim() || null,
        cost_amount: eventCostAmount ? Number(eventCostAmount) : null,
        cost_note: eventCostNote.trim() || null,
        signup_open: true,
      }

      if (editingEvent) {
        await updateEventMutation.mutateAsync({ eventId: editingEvent.id, updates: payload })
      } else {
        await createEventMutation.mutateAsync({
          club_id: clubId,
          ...payload,
        })
      }

      setEventTitle('')
      setEventDate('')
      setEventLocation('')
      setEventCostAmount('')
      setEventCostNote('')
      setEditingEvent(null)
      setShowEventModal(false)
      setSuccessMessage(editingEvent ? 'Event updated.' : 'Event created.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save event')
    }
  }

  const handleDeleteEvent = async (event: ClubEvent) => {
    if (!window.confirm(`Delete ${event.title}? Members will be notified that the session is cancelled.`)) return
    try {
      await deleteEventMutation.mutateAsync(event)
      setSuccessMessage('Event deleted.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Upcoming game days</h2>
            <div className="flex border border-[var(--arena-border)] rounded-lg p-0.5 bg-slate-100/80">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  eventsViewMode === 'list'
                    ? 'bg-[var(--arena-surface)] text-slate-300 shadow-sm'
                    : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)]'
                }`}
                onClick={() => setEventsViewMode('list')}
              >
                List
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  eventsViewMode === 'calendar'
                    ? 'bg-[var(--arena-surface)] text-slate-300 shadow-sm'
                    : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)]'
                }`}
                onClick={() => setEventsViewMode('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>

          {eventsViewMode === 'list' ? (
            events.filter((e) => new Date(e.event_date).getTime() >= nowTimestamp - 24 * 60 * 60 * 1000).length ? (
              <div className="space-y-3">
                {events
                  .filter((e) => new Date(e.event_date).getTime() >= nowTimestamp - 24 * 60 * 60 * 1000)
                  .slice(0, 5)
                  .map((event) => (
                    <EventCard 
                      key={event.id}
                      event={event}
                      clubId={clubId}
                      theme={theme}
                      accentColor={accent}
                      isAdmin={isAdmin}
                      isMember={isMember}
                      onRecordScore={onRecordScoreForEvent}
                      onViewHighlights={onViewHighlightsForEvent}
                      setSuccessMessage={setSuccessMessage}
                      setActionError={setActionError}
                      onEditEvent={openEditEventModal}
                      onDeleteEvent={handleDeleteEvent}
                    />
                  ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
                {eventsLoading ? 'Loading game days...' : 'No upcoming game days yet.'}
              </p>
            )
          ) : (
            <div className="space-y-4">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-800">
                  {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handlePrevMonth}
                    style={{ padding: '6px 10px', minHeight: '36px' }}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleNextMonth}
                    style={{ padding: '6px 10px', minHeight: '36px' }}
                    aria-label="Next month"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-[var(--arena-text-dim)] border-b border-slate-100 pb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx}>{day}</div>
                ))}
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  const dayEvents = getEventsForDate(cell.date)
                  const isSelected = selectedDate && 
                    cell.date.getDate() === selectedDate.getDate() &&
                    cell.date.getMonth() === selectedDate.getMonth() &&
                    cell.date.getFullYear() === selectedDate.getFullYear()
                  
                  const isToday = 
                    cell.date.getDate() === new Date().getDate() &&
                    cell.date.getMonth() === new Date().getMonth() &&
                    cell.date.getFullYear() === new Date().getFullYear()

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      className={`relative flex flex-col items-center justify-between p-1 sm:p-2 min-h-10 sm:min-h-12 border rounded-lg transition-all ${
                        cell.isCurrentMonth 
                          ? 'text-slate-300 bg-[var(--arena-surface)] border-[var(--arena-border)]/60' 
                          : 'text-[var(--arena-text-dim)] bg-[var(--arena-surface-muted)]/50 border-slate-100'
                      } ${
                        isSelected 
                          ? `ring-2 ${theme.ring} ${theme.bgLight}/20 ${theme.border}` 
                          : 'hover:bg-[var(--arena-surface-muted)]'
                      }`}
                    >
                      <span className={`text-xs font-bold ${
                        isToday ? `${theme.bg} text-white rounded-full w-5 h-5 flex items-center justify-center font-bold` : ''
                      }`}>
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-1">
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <span 
                              key={i} 
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? theme.bg : 'bg-slate-400'
                              }`} 
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selected Date Header and List */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="text-sm font-bold text-slate-800 mb-3">
                  Sessions on {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </h4>
                
                {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map((event) => (
                      <EventCard 
                        key={event.id}
                        event={event}
                        clubId={clubId}
                        theme={theme}
                        accentColor={accent}
                        isAdmin={isAdmin}
                        isMember={isMember}
                        onRecordScore={onRecordScoreForEvent}
                        onViewHighlights={onViewHighlightsForEvent}
                        setSuccessMessage={setSuccessMessage}
                        setActionError={setActionError}
                        onEditEvent={openEditEventModal}
                        onDeleteEvent={handleDeleteEvent}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 border border-dashed border-[var(--arena-border)] rounded-lg">
                    <p className="text-xs text-[var(--arena-text-dim)] mb-2">No game days scheduled for this date.</p>
                    {isAdmin && (
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          if (selectedDate) {
                            const year = selectedDate.getFullYear();
                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const day = String(selectedDate.getDate()).padStart(2, '0');
                            setEventDate(`${year}-${month}-${day}T18:00`);
                          }
                          setShowEventModal(true);
                        }}
                      >
                        + Create Session
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEventModal && isAdmin} onOpenChange={(open) => { if (!open) { setShowEventModal(false); setEditingEvent(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit event' : 'Create new event'}</DialogTitle>
            <DialogDescription>{editingEvent ? 'Update the session details members see.' : 'Add the next game day for members.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateEventSubmit}>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Event title *</span>
              <Input type="text" placeholder="e.g. Wednesday Singles Night" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} maxLength={120} required />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Date & time *</span>
              <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Location</span>
              <Input type="text" placeholder="e.g. Court 2" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} maxLength={200} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Cost per member (RM)</span>
                <Input type="number" min="0" step="0.01" placeholder="15.00" value={eventCostAmount} onChange={(e) => setEventCostAmount(e.target.value)} />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Cost note</span>
                <Input type="text" placeholder="Court + shuttle" value={eventCostNote} onChange={(e) => setEventCostNote(e.target.value)} maxLength={200} />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => { setShowEventModal(false); setEditingEvent(null) }} disabled={createEventMutation.isPending || updateEventMutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
                {createEventMutation.isPending || updateEventMutation.isPending ? 'Saving...' : editingEvent ? 'Save event' : 'Create event'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
