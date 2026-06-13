import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  ClipboardPenLine,
  UserPlus,
  Users,
  Settings,
  X,
  LayoutDashboard,
  Trophy,
  Megaphone,
} from 'lucide-react'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import ScorecardShareModal from '../components/ScorecardShareModal'
import CelebrationConfetti from '../components/CelebrationConfetti'
import { useAuth } from '../context/AuthContext'
import { useClub, useMyMembership, useClubMembers, useAllClubMatches } from '../features/clubs/hooks/useClubQueries'
import { getClubJoinRequests, approveJoinRequest, rejectJoinRequest, buildInviteUrl } from '../lib/api'
import type { ClubEvent, JoinRequest, MatchWithDetails } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page } from '../components/ui/page'
import { ClubHeader } from '../features/clubs/components/ClubHeader'
import { ClubNoticeboard } from '../features/clubs/components/ClubNoticeboard'
import { ClubEventsCalendar } from '../features/clubs/components/ClubEventsCalendar'
import { ClubLeaderboard } from '../features/clubs/components/ClubLeaderboard'
import { ClubScoresFeed } from '../features/clubs/components/ClubScoresFeed'
import { ClubMembersSidebar } from '../features/clubs/components/ClubMembersSidebar'
import { SessionHighlightsWidget } from '../features/clubs/components/SessionHighlightsWidget'

export default function ClubHomePage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: club, isLoading: clubLoading } = useClub(clubId)
  const { data: myMembership, isLoading: membershipLoading } = useMyMembership(clubId, !!user)
  const { data: members = [] } = useClubMembers(clubId)
  const { data: matches = [] } = useAllClubMatches(clubId)

  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'noticeboard'>('overview')
  const [showCelebrationModal, setShowCelebrationModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [actionError, setActionError] = useState('')

  // Modals state
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchWithDetails | null>(null)
  const [selectedScoreEventId, setSelectedScoreEventId] = useState<string | null>(null)
  const [selectedScoreEventTitle, setSelectedScoreEventTitle] = useState<string | null>(null)
  const [selectedScoreEventDate, setSelectedScoreEventDate] = useState<string | null>(null)

  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  const [showHighlightsEvent, setShowHighlightsEvent] = useState<ClubEvent | null>(null)
  const [shareMatch, setShareMatch] = useState<MatchWithDetails | null>(null)

  useEffect(() => {
    if (searchParams.get('celebrate') === 'true') {
      const timeout = window.setTimeout(() => {
        setShowCelebrationModal(true)
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('celebrate')
        setSearchParams(newParams, { replace: true })
      }, 0)

      return () => window.clearTimeout(timeout)
    }
  }, [searchParams, setSearchParams])

  if (clubLoading || membershipLoading || authLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading...</CardContent>
      </Card>
    )
  }

  if (!clubId || !club) return <Navigate to="/not-found" replace />

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = myMembership?.status === 'active' || user?.role === 'superadmin'
  const inviteUrl = club.invite_code ? buildInviteUrl(club.invite_code) : ''

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('General request link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId)
      setSuccessMessage('Request rejected.')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject request')
    }
  }

  // Score modal controllers
  const closeScoreModal = () => {
    setShowScoreModal(false)
    setEditingMatch(null)
    setSelectedScoreEventId(null)
    setSelectedScoreEventTitle(null)
    setSelectedScoreEventDate(null)
  }

  const handleCreateScore = () => {
    setEditingMatch(null)
    setSelectedScoreEventId(null)
    setSelectedScoreEventTitle(null)
    setSelectedScoreEventDate(null)
    setShowScoreModal(true)
  }

  const handleCreateScoreForEvent = (event: ClubEvent) => {
    setEditingMatch(null)
    setSelectedScoreEventId(event.id)
    setSelectedScoreEventTitle(event.title)
    const evDateStr = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : null
    setSelectedScoreEventDate(evDateStr)
    setShowScoreModal(true)
  }

  const handleEditMatch = (match: MatchWithDetails) => {
    setEditingMatch(match)
    setSelectedScoreEventId(match.event_id || null)
    setShowScoreModal(true)
  }

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}
      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Header Cover Banner */}
        <ClubHeader 
          clubId={clubId} 
          setSuccessMessage={setSuccessMessage} 
          setActionError={setActionError} 
        />

        {/* Tab Navigation */}
        <div className="border-b border-[var(--arena-border)] flex gap-1 overflow-x-auto whitespace-nowrap">
          {(['overview', 'leaderboard', 'noticeboard'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all duration-150 capitalize flex items-center gap-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-emerald-600 text-[var(--arena-accent)] bg-[var(--arena-surface)]'
                  : 'border-transparent text-[var(--arena-text-dim)] hover:text-slate-800 hover:border-[var(--arena-border)]'
              }`}
            >
              {tab === 'overview' && <LayoutDashboard size={16} />}
              {tab === 'leaderboard' && <Trophy size={16} />}
              {tab === 'noticeboard' && <Megaphone size={16} />}
              {tab === 'overview' ? 'Home' : tab === 'noticeboard' ? 'Notice Board' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pinned noticeboard announcements */}
            {club.announcement ? (
              <div className="rounded-2xl border border-amber-250 bg-amber-50/60 p-4 shadow-sm animate-fade-in">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface)] text-amber-700 shadow-sm border border-amber-200">
                    <Megaphone size={18} aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h3 className="text-sm font-bold text-amber-900">Pinned Announcement</h3>
                      {club.announcement_updated_at ? (
                        <span className="text-xs text-amber-600">
                          Updated {new Date(club.announcement_updated_at).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-amber-850 leading-relaxed whitespace-pre-wrap">
                      {club.announcement}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Club actions quick access */}
            {isMember ? (
              <Card className="border-blue-200 bg-blue-50/60">
                <CardContent className="space-y-3 pt-4 sm:pt-5">
                  <div className="flex items-center gap-2 text-blue-800">
                    <ShieldCheck size={18} aria-hidden="true" />
                    <h2 className="font-bold">{isAdmin ? 'Admin controls' : 'Club quick actions'}</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Button variant="secondary" onClick={handleCreateScore}>
                      <ClipboardPenLine size={17} aria-hidden="true" />
                      Record score
                    </Button>
                    {isAdmin ? (
                      <>
                        <Button variant="secondary" onClick={handleCopyInviteLink} disabled={!inviteUrl}>
                          <UserPlus size={17} aria-hidden="true" />
                          Copy invite
                        </Button>
                        <Button variant="secondary" onClick={() => { loadJoinRequests(); setShowJoinRequestsModal(true) }}>
                          <UserPlus size={17} aria-hidden="true" />
                          Requests
                        </Button>
                      </>
                    ) : (
                      inviteUrl && (
                        <Button variant="secondary" onClick={handleCopyInviteLink}>
                          <UserPlus size={17} aria-hidden="true" />
                          Copy invite
                        </Button>
                      )
                    )}
                    <Button variant="secondary" onClick={() => navigate(`/club/${clubId}/members`)}>
                      <Users size={17} aria-hidden="true" />
                      Members
                    </Button>
                    {isAdmin && (
                      <Button variant="secondary" onClick={() => navigate(`/club/${clubId}/settings`)}>
                        <Settings size={17} aria-hidden="true" />
                        Settings
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Upcoming events calendar */}
            <ClubEventsCalendar 
              clubId={clubId} 
              onRecordScoreForEvent={handleCreateScoreForEvent}
              onViewHighlightsForEvent={setShowHighlightsEvent}
              setSuccessMessage={setSuccessMessage}
              setActionError={setActionError}
            />

            {/* Scores feed vs Members sidebar */}
            <div className="grid gap-5 lg:grid-cols-2">
              <ClubScoresFeed 
                clubId={clubId} 
                onRecordScore={handleCreateScore} 
                onEditMatch={handleEditMatch}
                onShareMatch={setShareMatch}
                setSuccessMessage={setSuccessMessage}
                setActionError={setActionError}
              />
              <ClubMembersSidebar clubId={clubId} />
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <ClubLeaderboard 
            clubId={clubId} 
            setSuccessMessage={setSuccessMessage} 
            setActionError={setActionError}
          />
        )}

        {activeTab === 'noticeboard' && (
          <ClubNoticeboard 
            clubId={clubId} 
            setSuccessMessage={setSuccessMessage} 
            setActionError={setActionError} 
          />
        )}
      </div>

      {/* Modals & Portals */}
      {showJoinRequestsModal && isAdmin ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => setShowJoinRequestsModal(false)}>
          <Card className="max-h-[92vh] w-full overflow-auto rounded-b-none sm:max-w-lg sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--arena-text)]">Join requests</h2>
                  <p className="text-sm text-[var(--arena-text-muted)]">Approve or reject pending member requests. Email verification is required before approval.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowJoinRequestsModal(false)} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              {isLoadingRequests ? (
                <p className="text-sm text-[var(--arena-text-muted)]">Loading...</p>
              ) : joinRequests.length ? (
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="grid gap-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[var(--arena-text)]">{request.name || 'Unknown member'}</h3>
                        <p className="break-words text-sm text-[var(--arena-text-muted)]">{request.email}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button size="sm" type="button" onClick={() => handleApproveRequest(request.id)}>Approve</Button>
                        <Button size="sm" variant="secondary" type="button" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">No pending join requests.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ScoreRecordingModal
        isOpen={showScoreModal}
        onClose={closeScoreModal}
        clubId={clubId}
        editingMatch={editingMatch}
        eventId={selectedScoreEventId || undefined}
        eventTitle={selectedScoreEventTitle || undefined}
        eventDate={selectedScoreEventDate || undefined}
        clubName={club.name}
        onScoreRecorded={closeScoreModal}
      />

      {showHighlightsEvent && (
        <SessionHighlightsWidget
          isOpen={!!showHighlightsEvent}
          onClose={() => setShowHighlightsEvent(null)}
          event={showHighlightsEvent}
          matches={matches}
          members={members}
          onShareMatch={setShareMatch}
        />
      )}

      {shareMatch ? (
        <ScorecardShareModal
          match={shareMatch}
          clubName={club.name}
          onClose={() => setShareMatch(null)}
        />
      ) : null}

      {showCelebrationModal ? (
        <>
          <CelebrationConfetti />
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowCelebrationModal(false)}>
            <Card className="relative w-full max-w-md overflow-hidden rounded-2xl border-none bg-[var(--arena-surface)] text-center shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
              <CardContent className="space-y-6 px-6 pt-10 pb-8 sm:px-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] shadow-inner animate-bounce">
                  <span className="text-4xl">🎉</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--arena-accent)]">Congratulations!</p>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[var(--arena-text)]">
                    Welcome to the Club!
                  </h2>
                  <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
                    You are now an active member of <strong className="text-[var(--arena-text)]">{club.name}</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[var(--arena-surface-muted)] p-4 text-left space-y-3">
                  <div className="flex items-center gap-3">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={`${club.name} logo`} className="h-10 w-10 rounded-full object-cover border border-[var(--arena-border)]" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--arena-accent)] text-white font-bold">
                        {club.name[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-[var(--arena-text)] leading-tight">{club.name}</h4>
                      <p className="text-xs text-[var(--arena-text-dim)]">{club.city || 'Local Club'}</p>
                    </div>
                  </div>
                  {club.description && (
                    <p className="text-xs text-[var(--arena-text-muted)] italic line-clamp-2 leading-relaxed border-t border-[var(--arena-border)]/60 pt-2.5">
                      "{club.description}"
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-left text-xs">
                  <p className="font-bold text-[var(--arena-text-muted)] uppercase tracking-wide">Next steps:</p>
                  <ul className="space-y-2.5 text-[var(--arena-text-muted)] pl-1">
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-[var(--arena-accent)]">1</span>
                      <span>Check the **Upcoming Sessions** below and submit your RSVP.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-[var(--arena-accent)]">2</span>
                      <span>View recent match history and record set scores to update the ELO leaderboard.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    fullWidth
                    onClick={() => setShowCelebrationModal(false)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/10 font-bold"
                  >
                    Let's Play! 🏸
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </Page>
  )
}
