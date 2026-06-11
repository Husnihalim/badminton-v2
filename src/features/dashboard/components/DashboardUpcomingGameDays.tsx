import { CalendarDays, Check, Copy, MessageCircle, Share2 } from 'lucide-react'
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
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleNativeEventShare}
          >
            <Share2 size={15} aria-hidden="true" />
            Share
          </Button>
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--arena-border)] bg-surface px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[var(--arena-surface-muted)]"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} aria-hidden="true" />
            WhatsApp
          </a>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCopyEventShareLink}
          >
            <Copy size={15} aria-hidden="true" />
            Copy link
          </Button>
        </div>
        {event.signup_open ? (
          <div className="grid grid-cols-3 gap-2">
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
                >
                  {isSelected && !isPending ? <Check size={15} aria-hidden="true" /> : null}
                  {isPending ? '...' : label}
                </Button>
              )
            })}
          </div>
        ) : null}
        {myRsvp ? (
          <p className="text-sm font-semibold text-[var(--arena-text-muted)]">
            Your response: {getRsvpLabel(myRsvp.status)}
          </p>
        ) : null}
        <div className="space-y-2 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
              {acceptedRsvps.length} accepted
            </Badge>
            <Badge className="border-amber-200 bg-amber-50 text-amber-800">
              {holdingRsvps.length} holding
            </Badge>
            <Badge className="border-[var(--arena-border)] bg-surface text-[var(--arena-text-muted)]">
              {rejectedRsvps.length} rejected
            </Badge>
          </div>
          {acceptedRsvps.length ? (
            <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
              Joining:{' '}
              <span className="font-semibold">
                {acceptedRsvps.map((r) => r.name || 'Member').join(', ')}
              </span>
            </p>
          ) : (
            <p className="text-sm text-[var(--arena-text-dim)]">No accepted members yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
