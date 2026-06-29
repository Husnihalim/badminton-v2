import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Check, Copy, DollarSign, LogIn, MessageCircle, Share2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  buildEventShareText,
  buildEventShareUrl,
  getEventDetails,
  getEventRsvps,
  getMyEventRsvps,
  joinClubBySharedEvent,
  rsvpToEvent,
} from '../lib/api/events'
import { getMyMembership } from '../lib/api/clubs'
import type { ClubEvent, EventRsvp, Membership } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Page } from '../components/ui/page'

type SharedEvent = ClubEvent & {
  club?: {
    id: string
    name: string
    description: string | null
    open_join: boolean
    approval_required: boolean
  } | null
}

function formatEventCost(event: SharedEvent) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount = event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

function getRsvpLabel(status: EventRsvp['status']) {
  if (status === 'going') return 'Accepted'
  if (status === 'maybe') return 'Holding'
  return 'Rejected'
}

export default function GameDaySharePage() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [event, setEvent] = useState<SharedEvent | null>(null)
  const [myMembership, setMyMembership] = useState<Membership | null>(null)
  const [myRsvp, setMyRsvp] = useState<EventRsvp | null>(null)
  const [eventRsvps, setEventRsvps] = useState<EventRsvp[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const shareUrl = useMemo(() => eventId ? buildEventShareUrl(eventId) : '', [eventId])
  const shareText = useMemo(() => event ? buildEventShareText(event) : shareUrl, [event, shareUrl])
  const redirectQuery = `?redirect=${encodeURIComponent(`/game/${eventId}`)}`
  const acceptedRsvps = eventRsvps.filter((r) => r.status === 'going')
  const holdingRsvps = eventRsvps.filter((r) => r.status === 'maybe')
  const rejectedRsvps = eventRsvps.filter((r) => r.status === 'not_going')
  const isFull = Boolean(event?.max_participants && acceptedRsvps.length >= event.max_participants)

  const loadEvent = useCallback(async () => {
    if (!eventId) return

    try {
      setIsLoading(true)
      setPageError('')
      const eventDetails = await getEventDetails(eventId)
      if (!eventDetails) {
        setPageError('Game day not found.')
        return
      }

      setEvent(eventDetails)

      if (user && eventDetails.club_id) {
        const [membership, myRsvps, rsvps] = await Promise.all([
          getMyMembership(eventDetails.club_id),
          getMyEventRsvps(),
          getEventRsvps(eventDetails.id),
        ])
        setMyMembership(membership)
        setMyRsvp(myRsvps.find((r) => r.event_id === eventDetails.id) || null)
        setEventRsvps(rsvps)
      } else {
        setMyMembership(null)
        setMyRsvp(null)
        setEventRsvps([])
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not load this game day.')
    } finally {
      setIsLoading(false)
    }
  }, [eventId, user])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadEvent()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [loadEvent])

  const copyShareLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setSuccessMessage('Game day link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const nativeShare = async () => {
    if (!event || !navigator.share) {
      await copyShareLink()
      return
    }

    await navigator.share({
      title: event.title,
      text: shareText,
      url: shareUrl,
    })
  }

  const handleRsvp = async (status: EventRsvp['status']) => {
    if (!event || !user) return

    try {
      setIsSaving(true)
      setPageError('')

      if (!myMembership) {
        await joinClubBySharedEvent(event.id)
      }

      await rsvpToEvent(event.id, status)
      setSuccessMessage(`Response saved: ${getRsvpLabel(status)}.`)
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadEvent()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not save your response.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || authLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading game day...</CardContent>
      </Card>
    )
  }

  if (pageError && !event) return <Navigate to="/not-found" replace />
  if (!event) return null

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-[var(--arena-text)] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}

      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--arena-accent)]">Shared game day</p>
          <h1 className="text-3xl font-bold leading-tight text-[var(--arena-text)]">{event.title}</h1>
          <p className="text-sm leading-6 text-[var(--arena-text-dim)]">
            {event.club?.name || 'Club game day'} · {new Date(event.event_date).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {pageError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pageError}</p> : null}

          <div className="grid gap-3 rounded-lg border border-slate-600 bg-[var(--arena-surface)] p-3 text-sm text-[var(--arena-text-dim)]">
            <p className="inline-flex items-center gap-2 font-semibold text-[var(--arena-text)]">
              <CalendarDays size={17} aria-hidden="true" />
              {new Date(event.event_date).toLocaleString()}
            </p>
            {event.location ? <p>{event.location}</p> : null}
            {formatEventCost(event) ? (
              <p className="inline-flex items-center gap-2 font-semibold text-[var(--arena-text-dim)]">
                <DollarSign size={16} aria-hidden="true" />
                {formatEventCost(event)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge className={event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'}>
                {event.signup_open ? 'Open' : 'Closed'}
              </Badge>
              {event.max_participants ? <Badge className="border-[var(--arena-border)] bg-[var(--arena-surface)] text-[var(--arena-text-dim)]">{acceptedRsvps.length}/{event.max_participants} accepted</Badge> : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--arena-border)] pt-4">
            <span className="text-xs font-semibold text-[var(--arena-text-dim)] uppercase tracking-wider">Share game day</span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={nativeShare}
                className="h-9 w-9 p-0 flex items-center justify-center cursor-pointer"
                title="Share event"
              >
                <Share2 size={15} aria-hidden="true" />
              </Button>
              <a
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] text-[var(--arena-text-dim)] transition-colors hover:bg-slate-700 cursor-pointer"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                title="Share on WhatsApp"
              >
                <MessageCircle size={15} aria-hidden="true" />
              </a>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={copyShareLink}
                className="h-9 w-9 p-0 flex items-center justify-center cursor-pointer"
                title="Copy event link"
              >
                <Copy size={15} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {!user ? (
            <div className="grid gap-2 rounded-lg border border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] p-3 sm:grid-cols-2">
              <Link to={`/register${redirectQuery}`}>
                <Button fullWidth>
                  <UserPlus size={17} aria-hidden="true" />
                  Sign up first
                </Button>
              </Link>
              <Link to={`/login${redirectQuery}`}>
                <Button fullWidth variant="secondary">
                  <LogIn size={17} aria-hidden="true" />
                  Log in
                </Button>
              </Link>
            </div>
          ) : event.signup_open ? (
            <div className="space-y-3">
              {!myMembership ? (
                <p className="rounded-lg border border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] p-3 text-sm font-semibold text-[var(--arena-accent)]">
                  Choose a response and we will add you to {event.club?.name || 'the club'} first.
                </p>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
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
                    disabled={isSaving || (status === 'going' && isFull && myRsvp?.status !== 'going')}
                    onClick={() => handleRsvp(status as EventRsvp['status'])}
                  >
                    {myRsvp?.status === status ? <Check size={15} aria-hidden="true" /> : null}
                    {label}
                  </Button>
                ))}
              </div>
              {myRsvp ? <p className="text-sm font-semibold text-[var(--arena-text-muted)]">Your response: {getRsvpLabel(myRsvp.status)}</p> : null}
            </div>
          ) : (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">Signup is closed for this game day.</p>
          )}

          {user ? (
            <div className="space-y-2 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] p-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">{acceptedRsvps.length} accepted</Badge>
                <Badge className="border-amber-200 bg-amber-50 text-amber-800">{holdingRsvps.length} holding</Badge>
                <Badge className="border-slate-600 bg-[var(--arena-surface)] text-[var(--arena-text-dim)]">{rejectedRsvps.length} rejected</Badge>
              </div>
              {acceptedRsvps.length ? (
                <p className="text-sm leading-6 text-[var(--arena-text-dim)]">
                  Joining: <span className="font-semibold">{acceptedRsvps.map((r) => r.name || 'Member').join(', ')}</span>
                </p>
              ) : (
                <p className="text-sm text-[var(--arena-text-dim)]">No accepted members yet.</p>
              )}
            </div>
          ) : null}

          <Button type="button" variant="secondary" onClick={() => navigate(event.club_id ? `/club/${event.club_id}` : '/dashboard')}>
            Open club
          </Button>
        </CardContent>
      </Card>
    </Page>
  )
}
