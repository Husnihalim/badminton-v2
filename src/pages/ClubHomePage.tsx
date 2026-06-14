import { useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  ClipboardPenLine,
  UserPlus,
  X,
  Home,
  Activity,
  Trophy,
  Users,
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
import { ClubMembersRoster } from '../features/clubs/components/ClubMembersRoster'
import { SessionHighlightsWidget } from '../features/clubs/components/SessionHighlightsWidget'

export default function ClubHomePage() {
  const { clubId } = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: club, isLoading: clubLoading } = useClub(clubId)
  const { data: myMembership, isLoading: membershipLoading } = useMyMembership(clubId, !!user)
  const { data: members = [] } = useClubMembers(clubId)
  const { data: matches = [] } = useAllClubMatches(clubId)

  const [activeTab, setActiveTab] = useState<'overview' | 'scores' | 'leaderboard' | 'members' | 'noticeboard'>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    const validTabs = ['overview', 'scores', 'leaderboard', 'members', 'noticeboard']
    return (tabParam && validTabs.includes(tabParam)) ? (tabParam as any) : 'overview'
  })
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

  // Sync tab query parameter with activeTab state
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const validTabs = ['overview', 'scores', 'leaderboard', 'members', 'noticeboard']
    if (tabParam && validTabs.includes(tabParam)) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam as any)
      }
    }
  }, [searchParams, activeTab])

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
          {([
            { id: 'overview', label: 'Home', icon: Home },
            { id: 'scores', label: 'Scores', icon: Activity },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'noticeboard', label: 'Notice Board', icon: Megaphone }
          ] as const).map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  const newParams = new URLSearchParams(window.location.search)
                  newParams.set('tab', tab.id)
                  setSearchParams(newParams, { replace: true })
                }}
                className={`px-3 py-2 font-semibold text-xs sm:text-sm border-b-2 transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[var(--arena-accent)] text-[var(--arena-accent)] bg-[var(--arena-surface)]'
                    : 'border-transparent text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] hover:border-[var(--arena-border)]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Pinned noticeboard announcements */}
            {club.announcement ? (
              <div className="rounded-xl border border-amber-250 bg-amber-50/60 p-3 shadow-sm sm:rounded-2xl sm:p-4 animate-fade-in">
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
                  <div className={`grid gap-2 ${
                    isAdmin ? 'grid-cols-3' : (inviteUrl ? 'grid-cols-2' : 'grid-cols-1')
                  }`}>
                    <button
                      type="button"
                      onClick={handleCreateScore}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer"
                    >
                      <ClipboardPenLine size={18} className="text-blue-700" aria-hidden="true" />
                      <span className="text-[10px] font-bold leading-tight">Record Score</span>
                    </button>
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyInviteLink}
                          disabled={!inviteUrl}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <UserPlus size={18} className="text-blue-700" aria-hidden="true" />
                          <span className="text-[10px] font-bold leading-tight">Copy Invite</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { loadJoinRequests(); setShowJoinRequestsModal(true) }}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer"
                        >
                          <UserPlus size={18} className="text-blue-700" aria-hidden="true" />
                          <span className="text-[10px] font-bold leading-tight">Requests</span>
                        </button>
                      </>
                    ) : (
                      inviteUrl && (
                        <button
                          type="button"
                          onClick={handleCopyInviteLink}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-blue-900 p-2 text-center transition-all hover:bg-blue-50 active:scale-[0.98] min-h-[68px] cursor-pointer"
                        >
                          <UserPlus size={18} className="text-blue-700" aria-hidden="true" />
                          <span className="text-[10px] font-bold leading-tight">Copy Invite</span>
                        </button>
                      )
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
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="animate-fade-in">
            <ClubScoresFeed 
              clubId={clubId} 
              onEditMatch={handleEditMatch}
              onShareMatch={setShareMatch}
              setSuccessMessage={setSuccessMessage}
              setActionError={setActionError}
            />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <ClubLeaderboard 
            clubId={clubId} 
            setSuccessMessage={setSuccessMessage} 
            setActionError={setActionError}
          />
        )}

        {activeTab === 'members' && (
          <div className="grid gap-4 lg:gap-5 lg:grid-cols-[1.15fr_0.85fr] items-start animate-fade-in">
            <div>
              <ClubMembersRoster
                clubId={clubId}
                clubName={club.name}
                members={members}
                myMembership={myMembership || null}
                setSuccessMessage={setSuccessMessage}
                setActionError={setActionError}
              />
            </div>
            <div>
              <ClubMembersSidebar clubId={clubId} hideRosterPreview={true} />
            </div>
          </div>
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
