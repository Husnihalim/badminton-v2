import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardPenLine,
  Copy,
  DollarSign,
  ExternalLink,
  MapPin,
  Megaphone,
  MessageCircle,
  Pencil,
  Settings,
  ShieldCheck,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import ScorecardShareModal from '../components/ScorecardShareModal'
import { useAuth } from '../context/AuthContext'
import {
  approveJoinRequest,
  buildEventShareText,
  buildEventShareUrl,
  buildInviteUrl,
  createClubAnnouncement,
  createEvent,
  deleteClubMessage,
  deleteEvent,
  getClub,
  getClubEvents,
  getClubLeaderboard,
  getClubJoinRequests,
  getClubMatches,
  getClubMessages,
  getClubMembers,
  deleteMatch,
  getEventRsvps,
  getMyEventRsvps,
  getMyMembership,
  regenerateInviteLink,
  rejectJoinRequest,
  requestJoinClub,
  rsvpToEvent,
  adminUpdateEventRsvp,
  updateClubMessage,
  updateEvent,
  type ClubLeaderboardRow,
} from '../lib/api'
import type { Club, ClubEvent, ClubMessage, EventRsvp, JoinRequest, MatchWithDetails, Membership } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Page, PageHeader } from '../components/ui/page'
import { Textarea } from '../components/ui/textarea'

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function formatEventCost(event: ClubEvent) {
  if (event.cost_amount == null && !event.cost_note) return null
  const amount = event.cost_amount != null ? `RM ${Number(event.cost_amount).toFixed(2)}` : null
  return [amount, event.cost_note].filter(Boolean).join(' · ')
}

function getClubLocationQuery(club: Club) {
  return [club.location, club.city].filter(Boolean).join(', ')
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

function renderRankBadge(rank: number) {
  if (rank === 1) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 shadow-sm border border-amber-200" title="Gold Medal">🥇</span>
  if (rank === 2) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 shadow-sm border border-slate-200" title="Silver Medal">🥈</span>
  if (rank === 3) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-800 shadow-sm border border-amber-100" title="Bronze Medal">🥉</span>
  return <span className="font-mono text-sm font-bold text-slate-500 w-6 text-center">#{rank}</span>
}

export default function ClubHomePage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [myMembership, setMyMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSecondaryLoading, setIsSecondaryLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const [showEventModal, setShowEventModal] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchWithDetails | null>(null)
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventCostAmount, setEventCostAmount] = useState('')
  const [eventCostNote, setEventCostNote] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null)
  const [editingMessage, setEditingMessage] = useState<ClubMessage | null>(null)

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [myRsvps, setMyRsvps] = useState<EventRsvp[]>([])
  const [eventRsvpCounts, setEventRsvpCounts] = useState<Record<string, number>>({})
  const [eventRsvpsByEvent, setEventRsvpsByEvent] = useState<Record<string, EventRsvp[]>>({})
  const [messages, setMessages] = useState<ClubMessage[]>([])
  const [leaderboard, setLeaderboard] = useState<ClubLeaderboardRow[]>([])
  const [shareMatch, setShareMatch] = useState<MatchWithDetails | null>(null)

  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [showManageRsvpEventId, setShowManageRsvpEventId] = useState<string | null>(null)
  const [isRsvpUpdating, setIsRsvpUpdating] = useState<string | null>(null)
  const [nowTimestamp] = useState(() => Date.now())

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = !!myMembership
  const canJoin = user && !isMember && club?.open_join !== false
  const inviteUrl = club?.invite_code ? buildInviteUrl(club.invite_code) : ''
  const userId = user?.id

  const closeScoreModal = () => {
    setShowScoreModal(false)
    setEditingMatch(null)
  }

  const handleCreateScore = () => {
    setEditingMatch(null)
    setShowScoreModal(true)
  }

  const handleEditMatch = (match: MatchWithDetails) => {
    setEditingMatch(match)
    setShowScoreModal(true)
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Delete this score? This action cannot be undone.')) {
      return
    }

    try {
      setIsSecondaryLoading(true)
      await deleteMatch(matchId)
      await loadClubData()
      setSuccessMessage('Score deleted successfully.')
    } catch (err) {
      console.error('Delete match failed:', err)
      setActionError(getErrorMessage(err, 'Failed to delete score'))
    } finally {
      setIsSecondaryLoading(false)
    }
  }

  const renderClickableMatchPlayers = (match: MatchWithDetails) => {
    const team1 = match.participants.filter(p => p.team === 1)
    const team2 = match.participants.filter(p => p.team === 2)

    const renderParticipant = (p: typeof match.participants[0], idx: number, arr: typeof match.participants) => {
      const pName = p.name || p.guest_name || 'Guest'
      const matchingMember = members.find(m => m.name?.toLowerCase() === pName.toLowerCase() || m.user_id === p.user_id)
      const isLast = idx === arr.length - 1

      return (
        <span key={p.id}>
          {matchingMember?.user_id ? (
            <Link to={`/member/${matchingMember.user_id}`} className="hover:underline font-semibold text-emerald-700">
              {pName}
            </Link>
          ) : (
            <span className="text-slate-700">{pName}</span>
          )}
          {!isLast && ' & '}
        </span>
      )
    }

    return (
      <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center">
        {team1.map(renderParticipant)}
        <span className="text-slate-400 mx-1.5 font-bold">vs</span>
        {team2.map(renderParticipant)}
      </div>
    )
  }

  const loadClubData = useCallback(async () => {
    if (!clubId) return
    
    try {
      setIsLoading(true)
      setIsSecondaryLoading(false)
      setPageError('')
      setActionError('')
      setSectionErrors({})
      setMembers([])
      setMatches([])
      setEvents([])
      setMessages([])
      setLeaderboard([])
      setMyRsvps([])
      setEventRsvpCounts({})
      setEventRsvpsByEvent({})
      
      const [clubData, eventsData, membershipData, messageData] = await Promise.all([
        getClub(clubId),
        getClubEvents(clubId),
        userId ? getMyMembership(clubId) : Promise.resolve(null),
        getClubMessages(clubId),
      ])

      if (!clubData) {
        setPageError('Club not found')
        return
      }

      setClub(clubData)
      const allEvents = [...eventsData]
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      setEvents(allEvents)
      setMyMembership(membershipData)
      setMessages(messageData.slice(0, 6))

      if (userId) {
        try {
          const rsvps = await getMyEventRsvps()
          setMyRsvps(rsvps)
        } catch (err) {
          console.error('Failed to load my RSVPs:', err)
          setSectionErrors((prev) => ({ ...prev, rsvps: 'Could not load your session responses.' }))
        }
      }

      const rsvpResults = await Promise.allSettled(
        allEvents.map((event) => getEventRsvps(event.id))
      )
      const rsvpCounts: Record<string, number> = {}
      const rsvpMap: Record<string, EventRsvp[]> = {}
      rsvpResults.forEach((result, index) => {
        const event = allEvents[index]
        if (result.status === 'fulfilled') {
          rsvpMap[event.id] = result.value
          rsvpCounts[event.id] = result.value.filter((r) => r.status === 'going').length
        } else {
          console.error(`Failed to load RSVPs for event ${event.id}:`, result.reason)
          setSectionErrors((prev) => ({ ...prev, rsvps: 'Some session attendance details could not be loaded.' }))
        }
      })
      setEventRsvpCounts(rsvpCounts)
      setEventRsvpsByEvent(rsvpMap)
      setIsLoading(false)

      setIsSecondaryLoading(true)
      const [membersResult, matchesResult, leaderboardResult] = await Promise.allSettled([
        getClubMembers(clubId),
        getClubMatches(clubId),
        getClubLeaderboard(clubId, 10),
      ])

      if (membersResult.status === 'fulfilled') {
        setMembers(membersResult.value)
      } else {
        console.error('Failed to load members:', membersResult.reason)
        setSectionErrors((prev) => ({ ...prev, members: 'Could not load member preview.' }))
      }

      if (matchesResult.status === 'fulfilled') {
        setMatches(matchesResult.value.slice(0, 10))
      } else {
        console.error('Failed to load scores:', matchesResult.reason)
        setSectionErrors((prev) => ({ ...prev, scores: 'Could not load recent scores.' }))
      }

      if (leaderboardResult.status === 'fulfilled') {
        setLeaderboard(leaderboardResult.value)
      } else {
        console.error('Failed to load leaderboard:', leaderboardResult.reason)
        setSectionErrors((prev) => ({ ...prev, leaderboard: 'Could not load leaderboard.' }))
      }
    } catch (err) {
      setPageError(getErrorMessage(err, 'Failed to load club data'))
    } finally {
      setIsLoading(false)
      setIsSecondaryLoading(false)
    }
  }, [clubId, userId])

  useEffect(() => {
    if (clubId) {
      loadClubData()
    }
  }, [clubId, loadClubData])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return

    try {
      setIsCreatingEvent(true)
      const payload = {
        title: eventTitle,
        event_date: new Date(eventDate).toISOString(),
        location: eventLocation.trim() || null,
        cost_amount: eventCostAmount ? Number(eventCostAmount) : null,
        cost_note: eventCostNote.trim() || null,
        signup_open: true,
      }
      if (editingEvent) {
        await updateEvent(editingEvent.id, payload)
      } else {
        await createEvent({
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
      await loadClubData()
      setSuccessMessage(editingEvent ? 'Event updated.' : 'Event created.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(getErrorMessage(err, editingEvent ? 'Failed to update event' : 'Failed to create event'))
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const openCreateEventModal = () => {
    setEditingEvent(null)
    setEventTitle('')
    setEventDate('')
    setEventLocation('')
    setEventCostAmount('')
    setEventCostNote('')
    setShowEventModal(true)
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

  const handleDeleteEvent = async (event: ClubEvent) => {
    if (!window.confirm(`Delete ${event.title}? Members will be notified that the session is cancelled.`)) return

    try {
      await deleteEvent(event)
      await loadClubData()
      setSuccessMessage('Event deleted.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to delete event'))
    }
  }

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !announcementTitle.trim() || !announcementMessage.trim()) return

    try {
      setIsSendingAnnouncement(true)
      await createClubAnnouncement(clubId, announcementTitle.trim(), announcementMessage.trim())
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setEditingMessage(null)
      setShowAnnouncementModal(false)
      await loadClubData()
      setSuccessMessage('Announcement sent to members.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to send announcement'))
    } finally {
      setIsSendingAnnouncement(false)
    }
  }

  const openCreateMessageModal = () => {
    setEditingMessage(null)
    setAnnouncementTitle('')
    setAnnouncementMessage('')
    setShowAnnouncementModal(true)
  }

  const openEditMessageModal = (message: ClubMessage) => {
    setEditingMessage(message)
    setAnnouncementTitle(message.title)
    setAnnouncementMessage(message.message)
    setShowAnnouncementModal(true)
  }

  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMessage || !announcementTitle.trim() || !announcementMessage.trim()) return

    try {
      setIsSendingAnnouncement(true)
      await updateClubMessage(editingMessage.id, announcementTitle.trim(), announcementMessage.trim())
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setEditingMessage(null)
      setShowAnnouncementModal(false)
      await loadClubData()
      setSuccessMessage('Message updated.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update message'))
    } finally {
      setIsSendingAnnouncement(false)
    }
  }

  const handleDeleteMessage = async (message: ClubMessage) => {
    if (!window.confirm(`Delete ${message.title}? This removes the message and related notifications.`)) return

    try {
      await deleteClubMessage(message.id)
      await loadClubData()
      setSuccessMessage('Message deleted.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to delete message'))
    }
  }

  const handleJoinClub = async () => {
    if (!clubId || !user) return

    try {
      await requestJoinClub(clubId)
      setActionError('')
      setSuccessMessage('Join request sent. A club admin will review it and you will be notified after approval.')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadClubData()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to send join request. Please try again.'))
    }
  }

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('Invite link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleGenerateInviteLink = async () => {
    if (!clubId) return

    try {
      setIsSecondaryLoading(true)
      setActionError('')
      const newCode = await regenerateInviteLink(clubId)

      if (!newCode) {
        throw new Error('No invite code returned')
      }

      setClub((currentClub) => (currentClub ? { ...currentClub, invite_code: newCode } : currentClub))
      setSuccessMessage('Invite link generated.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Generate invite link failed:', err)
      setActionError(getErrorMessage(err, 'Failed to generate invite link'))
    } finally {
      setIsSecondaryLoading(false)
    }
  }

  const handleCopyEventShareLink = async (event: ClubEvent) => {
    await navigator.clipboard.writeText(buildEventShareUrl(event.id))
    setSuccessMessage('Game day link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleNativeEventShare = async (event: ClubEvent) => {
    const shareUrl = buildEventShareUrl(event.id)
    const shareText = buildEventShareText({ ...event, clubName: club?.name })

    if (!navigator.share) {
      await navigator.clipboard.writeText(shareUrl)
      setSuccessMessage('Game day link copied.')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    await navigator.share({
      title: event.title,
      text: shareText,
      url: shareUrl,
    })
  }

  const handleNativeBoardShare = async () => {
    if (!club || !inviteUrl) return

    const shareText = [
      `${club.name} club board`,
      club.description,
      'Join the club to follow messages, announcements, and activity.',
      inviteUrl,
    ].filter(Boolean).join('\n')

    if (!navigator.share) {
      await navigator.clipboard.writeText(inviteUrl)
      setSuccessMessage('Board link copied.')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    await navigator.share({
      title: `${club.name} club board`,
      text: shareText,
      url: inviteUrl,
    })
  }

  const handleRsvp = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!user) return

    try {
      await rsvpToEvent(eventId, status)
      setSuccessMessage(`RSVP updated: ${status.replace('_', ' ')}.`)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      const rsvps = await getMyEventRsvps()
      setMyRsvps(rsvps)
      
      const eventRsvps = await getEventRsvps(eventId)
      setEventRsvpsByEvent((prev) => ({
        ...prev,
        [eventId]: eventRsvps,
      }))
      setEventRsvpCounts((prev) => ({
        ...prev,
        [eventId]: eventRsvps.filter((r) => r.status === 'going').length
      }))
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to RSVP'))
    }
  }

  const handleAdminRsvpUpdate = async (eventId: string, userId: string, status: 'going' | 'maybe' | 'not_going') => {
    try {
      setIsRsvpUpdating(`${eventId}-${userId}`)
      const updated = await adminUpdateEventRsvp(eventId, userId, status)
      
      if (updated) {
        if (userId === user?.id) {
          const rsvps = await getMyEventRsvps()
          setMyRsvps(rsvps)
        }
        
        const freshRsvps = await getEventRsvps(eventId)
        setEventRsvpsByEvent((prev) => ({
          ...prev,
          [eventId]: freshRsvps,
        }))
        setEventRsvpCounts((prev) => ({
          ...prev,
          [eventId]: freshRsvps.filter((r) => r.status === 'going').length,
        }))
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update member RSVP'))
    } finally {
      setIsRsvpUpdating(null)
    }
  }

  const renderEventCard = (event: ClubEvent) => {
    const myRsvp = myRsvps.find((r) => r.event_id === event.id)
    const eventRsvps = eventRsvpsByEvent[event.id] || []
    const acceptedRsvps = eventRsvps.filter((r) => r.status === 'going')
    const holdingRsvps = eventRsvps.filter((r) => r.status === 'maybe')
    const rejectedRsvps = eventRsvps.filter((r) => r.status === 'not_going')
    const rsvpCount = eventRsvpCounts[event.id] || acceptedRsvps.length
    const isFull = Boolean(event.max_participants && rsvpCount >= event.max_participants)
    const eventShareText = buildEventShareText({ ...event, clubName: club?.name || '' })
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(eventShareText)}`

    return (
      <div key={event.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-950">{event.title}</h3>
            <p className="text-sm text-slate-600">{new Date(event.event_date).toLocaleString()}</p>
            {event.location ? <p className="text-sm text-slate-600">{event.location}</p> : null}
            {formatEventCost(event) ? (
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
                <DollarSign size={15} aria-hidden="true" />
                {formatEventCost(event)}
              </p>
            ) : null}
          </div>
          {isAdmin ? (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button type="button" size="sm" variant="secondary" onClick={() => openEditEventModal(event)}>
                Edit
              </Button>
              <Button type="button" size="sm" variant="danger" onClick={() => handleDeleteEvent(event)}>
                Delete
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'}>
            {event.signup_open ? 'Open' : 'Closed'}
          </Badge>
          {event.max_participants ? <Badge className="border-slate-200 bg-white text-slate-700">{rsvpCount}/{event.max_participants} going</Badge> : null}
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
        {isMember && event.signup_open ? (
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
                onClick={() => handleRsvp(event.id, status as 'going' | 'maybe' | 'not_going')}
              >
                {myRsvp?.status === status ? <Check size={15} aria-hidden="true" /> : null}
                {label}
              </Button>
            ))}
          </div>
        ) : null}
        {myRsvp ? (
          <p className="text-sm font-semibold text-slate-700">Your response: {getRsvpLabel(myRsvp.status)}</p>
        ) : null}
        {isFull ? <p className="text-sm font-semibold text-red-600">Session full</p> : null}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">{acceptedRsvps.length} accepted</Badge>
            <Badge className="border-amber-200 bg-amber-50 text-amber-800">{holdingRsvps.length} holding</Badge>
            <Badge className="border-slate-200 bg-slate-50 text-slate-700">{rejectedRsvps.length} rejected</Badge>
          </div>
          {acceptedRsvps.length ? (
            <p className="text-sm leading-6 text-slate-700">
              Joining: <span className="font-semibold">{acceptedRsvps.map((r) => r.name || 'Member').join(', ')}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">No accepted members yet.</p>
          )}
        </div>

        {/* Admin Attendance Management Panel */}
        {isAdmin && (
          <div className="pt-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full flex items-center justify-center gap-1.5"
              onClick={() => setShowManageRsvpEventId(prev => prev === event.id ? null : event.id)}
            >
              <Users size={14} aria-hidden="true" />
              {showManageRsvpEventId === event.id ? 'Hide attendance settings' : 'Manage member RSVPs'}
            </Button>

            {showManageRsvpEventId === event.id && (
              <div className="mt-2.5 p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Admin Control: Member Attendance List
                </h4>
                <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto pr-0.5">
                  {members
                    .filter((m) => m.status === 'active')
                    .map((member) => {
                      const rsvp = eventRsvps.find((r) => r.user_id === member.user_id)
                      const rsvpStatus = rsvp?.status || 'no_response'
                      const loadingKey = `${event.id}-${member.user_id}`
                      const isLoadingThis = isRsvpUpdating === loadingKey

                      return (
                        <div key={member.user_id} className="flex items-center justify-between py-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-5.5 h-5.5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] uppercase">
                              {member.name ? member.name.slice(0, 2).toUpperCase() : 'M'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{member.name || 'Anonymous'}</span>
                              <span className="text-[9px] text-slate-500 capitalize">{member.role}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isLoadingThis ? (
                              <span className="text-[9px] text-slate-500 px-2">Syncing...</span>
                            ) : (
                              <>
                                {[
                                  ['going', 'Going', 'bg-emerald-100 text-emerald-800 border-emerald-200'],
                                  ['maybe', 'Maybe', 'bg-amber-100 text-amber-800 border-amber-200'],
                                  ['not_going', 'No', 'bg-slate-100 text-slate-700 border-slate-200'],
                                ].map(([status, label, colorClass]) => {
                                  const isActive = rsvpStatus === status
                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                                        isActive 
                                          ? colorClass
                                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                      }`}
                                      onClick={() => handleAdminRsvpUpdate(event.id, member.user_id, status as 'going' | 'maybe' | 'not_going')}
                                    >
                                      {label}
                                    </button>
                                  )
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Calendar date calculations
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

  const loadJoinRequests = async () => {
    if (!clubId || !isAdmin) return
    
    try {
      setIsLoadingRequests(true)
      const requests = await getClubJoinRequests(clubId)
      setJoinRequests(requests)
    } catch (err) {
      console.error('Failed to load join requests:', err)
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveJoinRequest(requestId)
      setSuccessMessage('Request approved.')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
      await loadClubData()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to approve request'))
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId)
      setSuccessMessage('Request rejected.')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to reject request'))
    }
  }

  if (isLoading || authLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
      </Card>
    )
  }

  if (pageError || !club) return <Navigate to="/not-found" replace />

  const locationQuery = getClubLocationQuery(club)
  const mapUrl = locationQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}` : ''
  const memberCount = members.length || club.membersCount || 0
  const boardShareText = [
    `${club.name} club board`,
    club.description,
    'Join the club to follow announcements and game days.',
    inviteUrl,
  ].filter(Boolean).join('\n')
  const boardWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(boardShareText)}`
  const announcementItems = messages.map((message) => ({
    id: `message-${message.id}`,
    title: message.title,
    body: message.message,
    actor: message.authorName || 'Club admin',
    createdAt: message.created_at,
    message,
  }))

  // Sort matches chronologically descending for streaks
  const sortedMatchesForStreak = [...matches].sort((a, b) => new Date(b.match_date || b.created_at).getTime() - new Date(a.match_date || a.created_at).getTime())

  const playerStreaks = new Map<string, { count: number; type: 'win' | 'loss' | null; broken: boolean }>()

  for (const match of sortedMatchesForStreak) {
    const scoreSets = match.score_sets || []
    if (scoreSets.length === 0) continue

    const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
    if (team1Sets === team2Sets) continue // Draw

    const winningTeam = team1Sets > team2Sets ? 1 : 2

    for (const p of match.participants) {
      const name = p.name || p.guest_name || 'Guest'
      const isWin = p.team === winningTeam
      
      let streakInfo = playerStreaks.get(name)
      if (!streakInfo) {
        streakInfo = { count: 1, type: isWin ? 'win' : 'loss', broken: false }
        playerStreaks.set(name, streakInfo)
      } else if (!streakInfo.broken) {
        if (streakInfo.type === 'win' && isWin) {
          streakInfo.count++
        } else if (streakInfo.type === 'loss' && !isWin) {
          streakInfo.count++
        } else {
          streakInfo.broken = true
        }
      }
    }
  }

  // Calculate doubles combinations
  const doublesPairs = new Map<string, { wins: number; losses: number; matches: number }>()
  const doublesMatches = matches.filter(m => m.match_type === 'doubles')
  for (const match of doublesMatches) {
    const scoreSets = match.score_sets || []
    if (scoreSets.length === 0) continue

    const team1Sets = scoreSets.filter(s => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter(s => s.team2_score > s.team1_score).length
    if (team1Sets === team2Sets) continue

    const winningTeam = team1Sets > team2Sets ? 1 : 2

    const team1Participants = match.participants.filter(p => p.team === 1).map(p => p.name || p.guest_name || 'Guest')
    const team2Participants = match.participants.filter(p => p.team === 2).map(p => p.name || p.guest_name || 'Guest')

    if (team1Participants.length === 2) {
      team1Participants.sort()
      const pairKey = team1Participants.join(' & ')
      const stats = doublesPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
      stats.matches++
      if (winningTeam === 1) stats.wins++
      else stats.losses++
      doublesPairs.set(pairKey, stats)
    }

    if (team2Participants.length === 2) {
      team2Participants.sort()
      const pairKey = team2Participants.join(' & ')
      const stats = doublesPairs.get(pairKey) ?? { wins: 0, losses: 0, matches: 0 }
      stats.matches++
      if (winningTeam === 2) stats.wins++
      else stats.losses++
      doublesPairs.set(pairKey, stats)
    }
  }

  const topDoublesPairs = Array.from(doublesPairs.entries())
    .map(([names, stats]) => {
      const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0
      return { names, ...stats, winRate }
    })
    .filter(p => p.matches >= 2)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.matches - a.matches)
    .slice(0, 3)

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}
      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <PageHeader
        eyebrow="Club"
        title={club.name}
        description={club.description || 'Club workspace for events, members, scores, and activity.'}
        actions={
          <>
            {canJoin ? (
              <Button onClick={handleJoinClub}>
                <UserPlus size={17} aria-hidden="true" />
                Request to join
              </Button>
            ) : null}
            {isAdmin ? (
              <Button variant="secondary" onClick={() => navigate(`/club/${clubId}/settings`)}>
                <Settings size={17} aria-hidden="true" />
                Settings
              </Button>
            ) : null}
          </>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {club.location ? <span className="inline-flex items-center gap-1"><MapPin size={15} aria-hidden="true" />{club.location}</span> : null}
            {club.city ? <span>{club.city}</span> : null}
            <span className="inline-flex items-center gap-1"><Users size={15} aria-hidden="true" />{memberCount} members</span>
            {myMembership?.status === 'active' ? <Badge>{myMembership.role}</Badge> : null}
            {isAdmin ? <Badge className="border-blue-200 bg-blue-50 text-blue-800">Admin</Badge> : null}
          </div>
          {locationQuery ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="min-w-0">
                Base location: <strong className="break-words text-slate-950">{locationQuery}</strong>
              </p>
              <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" href={mapUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden="true" />
                Open in Maps
              </a>
            </div>
          ) : null}
          {isAdmin ? (
            club.invite_code ? (
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="min-w-0">
                  Invite link: <strong className="break-all font-mono text-slate-950">{inviteUrl}</strong>
                </p>
                <Button type="button" size="sm" variant="secondary" onClick={handleCopyInviteLink}>
                  Copy
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-slate-900">No invite link is available yet.</p>
                <p>Generate one now so members and guests can join directly.</p>
                <Button type="button" size="sm" variant="secondary" onClick={handleGenerateInviteLink} disabled={isSecondaryLoading}>
                  Generate invite link
                </Button>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="space-y-3 pt-4 sm:pt-5">
            <div className="flex items-center gap-2 text-blue-800">
              <ShieldCheck size={18} aria-hidden="true" />
              <h2 className="font-bold">Admin controls</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Button onClick={openCreateEventModal}>
                <CalendarDays size={17} aria-hidden="true" />
                Create event
              </Button>
              <Button variant="secondary" onClick={handleCreateScore}>
                <ClipboardPenLine size={17} aria-hidden="true" />
                Record score
              </Button>
              <Button variant="secondary" onClick={handleCopyInviteLink} disabled={!inviteUrl}>
                <UserPlus size={17} aria-hidden="true" />
                Copy invite
              </Button>
              <Button variant="secondary" onClick={openCreateMessageModal}>
                <Megaphone size={17} aria-hidden="true" />
                Announcement
              </Button>
              <Button variant="secondary" onClick={() => { loadJoinRequests(); setShowJoinRequestsModal(true) }}>
                <UserPlus size={17} aria-hidden="true" />
                Requests
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/club/${clubId}/members`)}>
                <Users size={17} aria-hidden="true" />
                Members
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/club/${clubId}/settings`)}>
                <Settings size={17} aria-hidden="true" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950">Club board</h2>
            </div>
            {isAdmin ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" size="sm" variant="secondary" onClick={handleNativeBoardShare} disabled={!inviteUrl}>
                  <Share2 size={16} aria-hidden="true" />
                  Share
                </Button>
                <a className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 ${!inviteUrl ? 'pointer-events-none opacity-50' : ''}`} href={boardWhatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} aria-hidden="true" />
                  WhatsApp
                </a>
                <Button type="button" size="sm" variant="secondary" onClick={handleCopyInviteLink} disabled={!inviteUrl}>
                  <Copy size={16} aria-hidden="true" />
                  Copy
                </Button>
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
              onClick={openCreateMessageModal}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                <Megaphone size={18} aria-hidden="true" />
              </span>
              <span className="min-h-10 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500">
                Post an announcement
              </span>
            </button>
          ) : null}

          {announcementItems.length ? (
            <div className="space-y-3">
              {announcementItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                        <Megaphone size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{item.actor}</p>
                          <Badge className="border-blue-200 bg-blue-50 text-blue-800">Announcement</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                        <div className="mt-3 space-y-1">
                          <p className="font-bold text-slate-950">{item.title}</p>
                          <p className="text-sm leading-6 text-slate-600">{item.body}</p>
                        </div>
                      </div>
                    </div>
                    {isAdmin ? (
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button type="button" size="sm" variant="secondary" onClick={() => openEditMessageModal(item.message)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleDeleteMessage(item.message)}>
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
              {isSecondaryLoading ? 'Loading announcements...' : 'No announcements yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Upcoming game days</h2>
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100/80">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  eventsViewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                onClick={() => setEventsViewMode('list')}
              >
                List
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  eventsViewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                onClick={() => setEventsViewMode('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>

          {sectionErrors.rsvps ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{sectionErrors.rsvps}</p> : null}

          {eventsViewMode === 'list' ? (
            events.filter((e) => new Date(e.event_date).getTime() >= nowTimestamp - 24 * 60 * 60 * 1000).length ? (
              <div className="space-y-3">
                {events
                  .filter((e) => new Date(e.event_date).getTime() >= nowTimestamp - 24 * 60 * 60 * 1000)
                  .slice(0, 5)
                  .map((event) => renderEventCard(event))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No upcoming game days yet.</p>
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
              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
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
                      className={`relative flex flex-col items-center justify-between p-2 min-h-12 border rounded-lg transition-all ${
                        cell.isCurrentMonth 
                          ? 'text-slate-900 bg-white border-slate-200/60' 
                          : 'text-slate-400 bg-slate-50/50 border-slate-100'
                      } ${
                        isSelected 
                          ? 'ring-2 ring-emerald-600 bg-emerald-50/20 border-emerald-500' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-xs font-bold ${
                        isToday ? 'bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold' : ''
                      }`}>
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-1">
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <span 
                              key={i} 
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-emerald-600' : 'bg-slate-400'
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
                    {getEventsForDate(selectedDate).map((event) => renderEventCard(event))}
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-500 mb-2">No game days scheduled for this date.</p>
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
                            setEventDate(`${year}-${month}-${day}T18:00`); // default to 6 PM
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <h2 className="text-lg font-bold text-slate-950">Recent scores</h2>
            {sectionErrors.scores ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{sectionErrors.scores}</p> : null}
            {matches.length ? (
              <div className="space-y-3">
                {matches.slice(0, 5).map((match) => (
                  <div key={match.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-950">{match.title || `${match.sport} match`}</h3>
                        <p className="text-sm text-slate-500">{match.sport} • {match.match_type}</p>
                        {renderClickableMatchPlayers(match)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="secondary" size="icon" onClick={() => setShareMatch(match)} title="Share Scorecard">
                          <Share2 size={14} aria-hidden="true" />
                        </Button>
                        {isAdmin ? (
                          <>
                            <Button type="button" variant="secondary" size="icon" onClick={() => handleEditMatch(match)} title="Edit score">
                              <Pencil size={14} aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="danger" size="icon" onClick={() => handleDeleteMatch(match.id)} title="Delete score">
                              <Trash2 size={14} aria-hidden="true" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 font-semibold text-emerald-700">
                      {match.score_sets?.map((set) => `${set.team1_score}-${set.team2_score}`).join(', ')}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(match.match_date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                {isSecondaryLoading ? 'Loading scores...' : 'No results recorded yet.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <h2 className="text-lg font-bold text-slate-950">Club leaderboard</h2>
            {sectionErrors.leaderboard ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{sectionErrors.leaderboard}</p> : null}
            {leaderboard.length ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((player, index) => {
                  const streak = playerStreaks.get(player.name)
                  const hasWinStreak = streak && streak.type === 'win' && streak.count >= 2

                  return (
                    <div key={player.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            {renderRankBadge(index + 1)}
                            {(() => {
                              const match = members.find(m => m.name?.toLowerCase() === player.name.toLowerCase())
                              return match?.user_id ? (
                                <Link to={`/member/${match.user_id}`} className="truncate font-semibold hover:underline text-emerald-700">
                                  {player.name}
                                </Link>
                              ) : (
                                <span className="truncate font-semibold text-slate-950">{player.name}</span>
                              )
                            })()}
                            {hasWinStreak ? (
                              <Badge className="border-amber-200 bg-amber-50 text-amber-700 gap-0.5 ml-2 font-extrabold shadow-sm shrink-0">
                                <Flame size={12} className="text-amber-500 animate-pulse shrink-0" />
                                {streak.count} Hot Run
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{player.games} GP</span>
                            <span>{player.wins}W</span>
                            <span>{player.losses}L</span>
                            <span>{player.winPercentage}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-950">{player.pointsFor} / {player.pointsAgainst} pts</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                {isSecondaryLoading ? 'Loading leaderboard...' : 'No matches recorded yet.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {topDoublesPairs.length ? (
        <Card>
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500 font-bold" />
              Top Doubles Pairs
            </h2>
            <p className="text-xs text-slate-500">Unbeatable combinations (played at least 2 matches together).</p>
            <div className="space-y-2">
              {topDoublesPairs.map((pair, index) => (
                <div key={pair.names} className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-500">#{index + 1}</span>
                      <span className="truncate font-semibold text-slate-950 text-sm">{pair.names}</span>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-slate-500">
                      <span>{pair.matches} Matches</span>
                      <span>{pair.wins} Wins</span>
                      <span>{pair.winRate}% Win Rate</span>
                    </div>
                  </div>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 font-bold shrink-0">
                    {pair.wins} - {pair.losses}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Members</h2>
            <Link to={`/club/${clubId}/members`} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
              View all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {sectionErrors.members ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{sectionErrors.members}</p> : null}
          {members.length ? (
            <div className="space-y-2">
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <span className="min-w-0 truncate font-semibold text-slate-950">
                    <Link to={`/member/${member.user_id}`} className="hover:underline text-emerald-700">
                      {member.name || 'Unknown member'}
                    </Link>
                  </span>
                  <Badge>{member.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
              {isSecondaryLoading ? 'Loading members...' : 'No members yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {showEventModal && isAdmin ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => { setShowEventModal(false); setEditingEvent(null) }}>
          <Card className="w-full rounded-b-none sm:max-w-md sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{editingEvent ? 'Edit event' : 'Create new event'}</h2>
                  <p className="text-sm text-slate-600">{editingEvent ? 'Update the session details members see.' : 'Add the next game day for members.'}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => { setShowEventModal(false); setEditingEvent(null) }} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              <form className="space-y-4" onSubmit={handleCreateEvent}>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Event title *</span>
                  <Input type="text" placeholder="e.g. Wednesday Singles Night" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} maxLength={120} required />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Date & time *</span>
                  <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Location</span>
                  <Input type="text" placeholder="e.g. Court 2" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} maxLength={200} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                    <span>Cost per member (RM)</span>
                    <Input type="number" min="0" step="0.01" placeholder="15.00" value={eventCostAmount} onChange={(e) => setEventCostAmount(e.target.value)} />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                    <span>Cost note</span>
                    <Input type="text" placeholder="Court + shuttle" value={eventCostNote} onChange={(e) => setEventCostNote(e.target.value)} maxLength={200} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => { setShowEventModal(false); setEditingEvent(null) }} disabled={isCreatingEvent}>Cancel</Button>
                  <Button type="submit" disabled={isCreatingEvent}>
                    {isCreatingEvent ? 'Saving...' : editingEvent ? 'Save event' : 'Create event'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showAnnouncementModal && isAdmin ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => { setShowAnnouncementModal(false); setEditingMessage(null) }}>
          <Card className="w-full rounded-b-none sm:max-w-md sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{editingMessage ? 'Edit message' : 'Notify members'}</h2>
                  <p className="text-sm text-slate-600">{editingMessage ? 'Update the message and member notifications.' : 'Send news or updates to all active club members.'}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => { setShowAnnouncementModal(false); setEditingMessage(null) }} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              <form className="space-y-4" onSubmit={editingMessage ? handleUpdateMessage : handleSendAnnouncement}>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Title *</span>
                  <Input type="text" placeholder="e.g. Court changed this Friday" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} maxLength={120} required />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Message *</span>
                  <Textarea placeholder="Write the update members should see." value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} maxLength={1000} required />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => { setShowAnnouncementModal(false); setEditingMessage(null) }} disabled={isSendingAnnouncement}>Cancel</Button>
                  <Button type="submit" disabled={isSendingAnnouncement}>
                    {isSendingAnnouncement ? 'Saving...' : editingMessage ? 'Save message' : 'Send'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showJoinRequestsModal && isAdmin ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => setShowJoinRequestsModal(false)}>
          <Card className="max-h-[92vh] w-full overflow-auto rounded-b-none sm:max-w-lg sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Join requests</h2>
                  <p className="text-sm text-slate-600">Approve or reject pending member requests.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowJoinRequestsModal(false)} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              {isLoadingRequests ? (
                <p className="text-sm text-slate-600">Loading...</p>
              ) : joinRequests.length ? (
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-950">{request.name || 'Unknown member'}</h3>
                        <p className="break-words text-sm text-slate-600">{request.email}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" type="button" onClick={() => handleApproveRequest(request.id)}>Approve</Button>
                        <Button size="sm" variant="secondary" type="button" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No pending join requests.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ScoreRecordingModal
        isOpen={showScoreModal}
        onClose={closeScoreModal}
        clubId={club?.id}
        editingMatch={editingMatch}
        onScoreRecorded={() => {
          loadClubData()
          closeScoreModal()
        }}
      />

      {shareMatch ? (
        <ScorecardShareModal
          match={shareMatch}
          clubName={club?.name || 'Club'}
          onClose={() => setShareMatch(null)}
        />
      ) : null}
    </Page>
  )
}
