import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Check, Club as ClubIcon, Copy, MessageCircle, Share2, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { buildEventShareText, buildEventShareUrl, getMyClubs, getClubEvents, getClubMatches, getEventRsvps, getMyEventRsvps, rsvpToEvent } from '../lib/api'
import type { Club, ClubEvent, EventRsvp, MatchWithDetails } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'

type DashboardClub = Club & { role?: string }
type DashboardEvent = ClubEvent & { clubName?: string }
type DashboardMatch = MatchWithDetails & { clubName?: string }

function formatEventCost(event: DashboardEvent) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount = event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

function getRsvpLabel(status: EventRsvp['status']) {
  if (status === 'going') return 'Accepted'
  if (status === 'maybe') return 'Holding'
  return 'Rejected'
}

function renderMatchPlayers(match: DashboardMatch) {
  const team1 = match.participants
    .filter((participant) => participant.team === 1)
    .map((participant) => participant.name || participant.guest_name || 'Guest')
  const team2 = match.participants
    .filter((participant) => participant.team === 2)
    .map((participant) => participant.name || participant.guest_name || 'Guest')

  if (!team1.length || !team2.length) {
    return match.title || `${match.sport} match`
  }

  const formatTeam = (team: string[]) => team.join(team.length > 1 ? ' & ' : '')
  return `${formatTeam(team1)} vs ${formatTeam(team2)}`
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { showToast } = useNotifications()
  const navigate = useNavigate()
  
  const [clubs, setClubs] = useState<DashboardClub[]>([])
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [matches, setMatches] = useState<DashboardMatch[]>([])
  const [myRsvps, setMyRsvps] = useState<EventRsvp[]>([])
  const [eventRsvpsByEvent, setEventRsvpsByEvent] = useState<Record<string, EventRsvp[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const myClubs = await getMyClubs()
      setClubs(myClubs)
      
      const allEvents: DashboardEvent[] = []
      const allMatches: DashboardMatch[] = []
      const clubResults = await Promise.allSettled(
        myClubs.map(async (club) => {
          const [clubEvents, clubMatches] = await Promise.all([
            getClubEvents(club.id),
            getClubMatches(club.id),
          ])

          return { club, clubEvents, clubMatches }
        })
      )

      clubResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { club, clubEvents, clubMatches } = result.value
          const now = Date.now()
          allEvents.push(
            ...clubEvents
              .filter((event) => new Date(event.event_date).getTime() >= now)
              .map((event) => ({ ...event, clubName: club.name }))
          )
          allMatches.push(...clubMatches.map(m => ({ ...m, clubName: club.name })))
        } else {
          console.error(`Error loading data for club ${myClubs[index]?.id}:`, result.reason)
        }
      })
      
      // Sort events by date (upcoming first)
      allEvents.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      
      // Sort matches by date (most recent first)
      allMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      const visibleEvents = allEvents.slice(0, 5)
      setEvents(visibleEvents)
      setMatches(allMatches.slice(0, 5))

      const myEventRsvps = await getMyEventRsvps()
      setMyRsvps(myEventRsvps)

      const eventRsvpResults = await Promise.allSettled(
        visibleEvents.map((event) => getEventRsvps(event.id))
      )
      const eventRsvpMap: Record<string, EventRsvp[]> = {}
      eventRsvpResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          eventRsvpMap[visibleEvents[index].id] = result.value
        }
      })
      setEventRsvpsByEvent(eventRsvpMap)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  const handleRsvp = async (eventId: string, status: EventRsvp['status']) => {
    try {
      await rsvpToEvent(eventId, status)
      showToast(`Session response updated: ${getRsvpLabel(status)}.`, 'success')

      const [updatedMyRsvps, updatedEventRsvps] = await Promise.all([
        getMyEventRsvps(),
        getEventRsvps(eventId),
      ])
      setMyRsvps(updatedMyRsvps)
      setEventRsvpsByEvent((prev) => ({
        ...prev,
        [eventId]: updatedEventRsvps,
      }))
    } catch (err) {
      console.error('Error updating dashboard RSVP:', err)
      showToast('Failed to update session response', 'error')
    }
  }

  const handleCopyEventShareLink = async (event: DashboardEvent) => {
    await navigator.clipboard.writeText(buildEventShareUrl(event.id))
    showToast('Game day link copied.', 'success')
  }

  const handleNativeEventShare = async (event: DashboardEvent) => {
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

  useEffect(() => {
    if (authLoading || !user) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData()
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false)
    }, 5000)
    
    return () => clearTimeout(timeout)
  }, [user, authLoading, loadDashboardData])

  if (authLoading || (user && isLoading)) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="mx-auto mt-6 max-w-md">
        <CardContent className="space-y-4 pt-5 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Welcome to KelabSukan</h1>
            <p className="text-sm leading-6 text-slate-600">
              Log in to view your dashboard, clubs, events, and match scores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => navigate('/login')}>
              Log in
            </Button>
            <Button variant="secondary" onClick={() => navigate('/register')}>
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate stats
  const totalMatches = matches.length
  const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date()).length
  const clubCount = clubs.length

  return (
    <Page>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Your next sessions, club actions, and recent updates in one place."
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={<Users size={17} />} label="Clubs" value={clubCount} />
        <StatCard icon={<CalendarDays size={17} />} label="Events" value={upcomingEvents} />
        <StatCard icon={<Trophy size={17} />} label="Matches" value={totalMatches} />
      </div>


      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Your clubs</h2>
        {clubs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link 
                key={club.id} 
                to={`/club/${club.id}`}
                className="block"
              >
                <Card className="h-full transition hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="space-y-3 pt-4 sm:pt-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <ClubIcon size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-950">{club.name}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{club.description}</p>
                      </div>
                    </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                    <span>{club.city}</span>
                    <span>{club.membersCount} members</span>
                  </div>
                    <Badge>{club.role || 'member'}</Badge>
                    {club.role === 'owner' || club.role === 'admin' ? (
                      <Badge className="border-blue-200 bg-blue-50 text-blue-800">
                        <ShieldCheck size={14} aria-hidden="true" />
                        Admin actions
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-5 text-center">
              <p className="text-sm text-slate-600">You have not joined any clubs yet.</p>
              <Link to="/" className="brand-button">
                Find clubs
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Upcoming game days</h2>
        {events.length ? (
          <div className="grid gap-3">
            {events.map((event) => {
              const myRsvp = myRsvps.find((r) => r.event_id === event.id)
              const eventRsvps = eventRsvpsByEvent[event.id] || []
              const acceptedRsvps = eventRsvps.filter((r) => r.status === 'going')
              const holdingRsvps = eventRsvps.filter((r) => r.status === 'maybe')
              const rejectedRsvps = eventRsvps.filter((r) => r.status === 'not_going')
              const isFull = Boolean(event.max_participants && acceptedRsvps.length >= event.max_participants)
              const eventShareText = buildEventShareText(event)
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(eventShareText)}`

              return (
              <Card key={event.id}>
                <CardContent className="space-y-4 pt-4 sm:pt-5">
                  <div className="flex items-start gap-3">
                  <CalendarDays className="mt-1 shrink-0 text-emerald-700" size={18} aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-950">{event.title}</h3>
                    <p className="text-sm text-slate-500">{event.clubName}</p>
                    <p className="text-sm text-slate-700">{new Date(event.event_date).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">{event.location}</p>
                    {formatEventCost(event) ? <p className="text-sm font-semibold text-slate-800">{formatEventCost(event)}</p> : null}
                  <Badge className={event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'}>
                    {event.signup_open ? 'Open for signup' : 'Closed'}
                  </Badge>
                  </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleNativeEventShare(event)}>
                      <Share2 size={15} aria-hidden="true" />
                      Share
                    </Button>
                    <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50" href={whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle size={15} aria-hidden="true" />
                      WhatsApp
                    </a>
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleCopyEventShareLink(event)}>
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
                      ].map(([status, label]) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={myRsvp?.status === status ? 'primary' : 'secondary'}
                          disabled={status === 'going' && isFull && myRsvp?.status !== 'going'}
                          onClick={() => handleRsvp(event.id, status as EventRsvp['status'])}
                        >
                          {myRsvp?.status === status ? <Check size={15} aria-hidden="true" /> : null}
                          {label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  {myRsvp ? <p className="text-sm font-semibold text-slate-700">Your response: {getRsvpLabel(myRsvp.status)}</p> : null}
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">{acceptedRsvps.length} accepted</Badge>
                      <Badge className="border-amber-200 bg-amber-50 text-amber-800">{holdingRsvps.length} holding</Badge>
                      <Badge className="border-slate-200 bg-white text-slate-700">{rejectedRsvps.length} rejected</Badge>
                    </div>
                    {acceptedRsvps.length ? (
                      <p className="text-sm leading-6 text-slate-700">
                        Joining: <span className="font-semibold">{acceptedRsvps.map((r) => r.name || 'Member').join(', ')}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">No accepted members yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        ) : (
          <p className="empty-state">No upcoming events.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Recent match results</h2>
        {matches.length ? (
          <div className="grid gap-3">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardContent className="flex items-start gap-3 pt-4 sm:pt-5">
                  <Trophy className="mt-1 shrink-0 text-emerald-700" size={18} aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-950">{match.title || `${match.sport} match`}</h3>
                    <p className="text-sm text-slate-500">{renderMatchPlayers(match)}</p>
                    <p className="text-sm text-slate-500">{match.clubName}</p>
                    <p className="text-sm text-slate-600">{match.sport} • {match.match_type}</p>
                    <p className="font-semibold text-emerald-700">
                      {match.score_sets?.map((s) => `${s.team1_score}-${s.team2_score}`).join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="empty-state">No matches recorded yet.</p>
        )}
      </section>
    </Page>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-slate-500">
          <span className="text-xs font-semibold sm:text-sm">{label}</span>
          <span className="text-emerald-700">{icon}</span>
        </div>
        <p className="text-2xl font-bold leading-none text-slate-950 sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}
