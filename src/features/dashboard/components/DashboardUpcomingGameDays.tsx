import { CalendarDays, Check, Copy, MessageCircle, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { useMyRsvps, useEventRsvps } from '../../clubs/hooks/useClubQueries'
import { useRsvpToEvent } from '../../hooks/useMutations'
import { useNotifications } from '../../../context/NotificationsContext'
import { useAuth } from '../../../context/AuthContext'
import {
  buildEventShareText,
  buildEventShareUrl,
} from '../../../lib/api'
import type { ClubEvent, EventRsvp } from '../../../types'

type DashboardEvent = ClubEvent & { clubName?: string }

interface DashboardUpcomingGameDaysProps {
  events: DashboardEvent[]
}

function formatEventCost(event: DashboardEvent) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount =
    event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

function getRsvpLabel(status: EventRsvp['status']) {
  if (status === 'going') return 'Accepted'
  if (status === 'maybe') return 'Holding'
  return 'Rejected'
}

export default function DashboardUpcomingGameDays({ events }: DashboardUpcomingGameDaysProps) {
  const { user } = useAuth()
  const { data: myRsvps = [] } = useMyRsvps(!!user)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--arena-text)]">Upcoming game days</h2>
      {events.length ? (
        <div className="grid gap-3">
          {events.map((event) => {
            const myRsvp = myRsvps.find((r) => r.event_id === event.id)
            return (
              <UpcomingEventCard
                key={event.id}
                event={event}
                myRsvp={myRsvp}
              />
            )
          })}
        </div>
      ) : (
        <p className="empty-state">No upcoming events.</p>
      )}
    </section>
  )
}

interface UpcomingEventCardProps {
  event: DashboardEvent
  myRsvp?: EventRsvp
}

function UpcomingEventCard({ event, myRsvp }: UpcomingEventCardProps) {
  const { showToast } = useNotifications()
  const rsvpMutation = useRsvpToEvent()
  const { data: eventRsvps = [] } = useEventRsvps(event.id)

  const acceptedRsvps = eventRsvps.filter((r) => r.status === 'going')
  const holdingRsvps = eventRsvps.filter((r) => r.status === 'maybe')
  const rejectedRsvps = eventRsvps.filter((r) => r.status === 'not_going')

  const isFull = Boolean(
    event.max_participants && acceptedRsvps.length >= event.max_participants
  )
  const eventShareText = buildEventShareText(event)
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(eventShareText)}`

  const handleCopyEventShareLink = async () => {
    await navigator.clipboard.writeText(buildEventShareUrl(event.id))
    showToast('Game day link copied.', 'success')
  }

  const handleNativeEventShare = async () => {
    const shareUrl = buildEventShareUrl(event.id)
    const shareText = buildEventShareText(event)

    if (!navigator.share) {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Game day link copied.', 'success')
      return
    }

    await navigator.share({
      title: event.title,
      text: shareText,
      url: shareUrl,
    })
  }

  const handleRsvp = async (status: EventRsvp['status']) => {
    try {
      await rsvpMutation.mutateAsync({ eventId: event.id, status })
      showToast(`Session response updated: ${getRsvpLabel(status)}.`, 'success')
    } catch (err) {
      console.error('Error updating RSVP:', err)
      showToast('Failed to update session response', 'error')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4 sm:pt-5">
        <div className="flex items-start gap-3">
          <CalendarDays
            className="mt-1 shrink-0 text-[var(--arena-accent)]"
            size={18}
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <h3 className="font-bold text-[var(--arena-text)]">{event.title}</h3>
            <p className="text-sm text-[var(--arena-text-dim)]">{event.clubName}</p>
            <p className="text-sm text-[var(--arena-text-muted)]">
              {new Date(event.event_date).toLocaleString()}
            </p>
            <p className="text-sm text-[var(--arena-text-muted)]">{event.location}</p>
            {formatEventCost(event) ? (
              <p className="text-sm font-semibold text-slate-800">{formatEventCost(event)}</p>
            ) : null}
            <Badge
              className={
                event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'
              }
            >
              {event.signup_open ? 'Open for signup' : 'Closed'}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleNativeEventShare}
            className="text-[11px] sm:text-xs px-2 min-h-8 sm:min-h-9 gap-1"
          >
            <Share2 size={13} aria-hidden="true" />
            Share
          </Button>
          <a
            className="inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] px-2 text-[11px] sm:text-xs font-semibold text-[var(--arena-text)] transition-all duration-150 hover:bg-[var(--arena-accent-soft)] hover:text-[var(--arena-accent)] hover:border-[var(--arena-accent)] active:scale-[0.98]"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={13} aria-hidden="true" />
            WhatsApp
          </a>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCopyEventShareLink}
            className="text-[11px] sm:text-xs px-2 min-h-8 sm:min-h-9 gap-1"
          >
            <Copy size={13} aria-hidden="true" />
            Copy link
          </Button>
        </div>
        {event.signup_open ? (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ['going', 'Accept'],
              ['maybe', 'Hold'],
              ['not_going', 'Reject'],
            ].map(([status, label]) => {
              const isSelected = myRsvp?.status === status
              const isPending = rsvpMutation.isPending && rsvpMutation.variables?.status === status

              return (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'primary' : 'secondary'}
                  disabled={
                    (status === 'going' && isFull && !isSelected) || rsvpMutation.isPending
                  }
                  onClick={() => handleRsvp(status as EventRsvp['status'])}
                  className="min-h-8 sm:min-h-9 text-xs"
                >
                  {isSelected && !isPending ? <Check size={13} aria-hidden="true" /> : null}
                  {isPending ? '...' : label}
                </Button>
              )
            })}
          </div>
        ) : null}
        {myRsvp ? (
          <p className="text-xs font-semibold text-[var(--arena-text-muted)]">
            Your response: {getRsvpLabel(myRsvp.status)}
          </p>
        ) : null}
        <div className="space-y-1.5 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] text-[10px] px-1.5 py-0.5">
              {acceptedRsvps.length} accepted
            </Badge>
            <Badge className="border-amber-200 bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0.5">
              {holdingRsvps.length} holding
            </Badge>
            <Badge className="border-[var(--arena-border)] bg-surface text-[var(--arena-text-muted)] text-[10px] px-1.5 py-0.5">
              {rejectedRsvps.length} rejected
            </Badge>
          </div>
          {acceptedRsvps.length ? (
            <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs text-[var(--arena-text-muted)] pt-1">
              <span className="font-semibold shrink-0">Joining:</span>
              <div className="flex flex-wrap gap-1">
                {acceptedRsvps.map((r) => {
                  const name = r.name || 'Member'
                  const chip = (
                    <div className="inline-flex items-center gap-1 rounded bg-[var(--arena-surface)] px-1.5 py-0.5 text-[11px] text-[var(--arena-text)] hover:bg-[var(--arena-accent-soft)] hover:text-[var(--arena-accent)] border border-[var(--arena-border)] transition-colors shrink-0">
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
      </CardContent>
    </Card>
  )
}
