import { useParams, Navigate, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { 
  getClub, 
  getClubMembers, 
  getClubEvents, 
  getClubMatches, 
  getMyMembership, 
  createEvent,
  requestJoinClub,
  joinOpenClub,
  getClubJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  rsvpToEvent,
  getEventRsvps,
  getMyEventRsvps,
  getClubActivity
} from '../lib/api'
import type { Club, ClubEvent, MatchWithDetails, Membership, JoinRequest, EventRsvp, ClubActivity } from '../types'

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
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [showEventModal, setShowEventModal] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showMemberScoreModal, setShowMemberScoreModal] = useState(false)
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false)
  
  // Event creation form
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)

  // Join requests
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  // RSVPs
  const [myRsvps, setMyRsvps] = useState<EventRsvp[]>([])
  const [eventRsvpCounts, setEventRsvpCounts] = useState<Record<string, number>>({})

  // Activity feed
  const [activities, setActivities] = useState<ClubActivity[]>([])

  useEffect(() => {
    if (clubId) {
      loadClubData()
    }
  }, [clubId, user])

  const loadClubData = async () => {
    if (!clubId) return
    
    try {
      setIsLoading(true)
      setError('')
      
      const [clubData, membersData, eventsData, matchesData, membershipData] = await Promise.all([
        getClub(clubId),
        getClubMembers(clubId),
        getClubEvents(clubId),
        getClubMatches(clubId),
        user ? getMyMembership(clubId) : Promise.resolve(null),
      ])

      if (!clubData) {
        setError('Club not found')
        return
      }

      setClub(clubData)
      setMembers(membersData)
      setEvents(eventsData)
      setMatches(matchesData)
      setMyMembership(membershipData)

      // Load user's RSVPs
      if (user) {
        const rsvps = await getMyEventRsvps()
        setMyRsvps(rsvps)
      }

      // Load RSVP counts for each event
      const rsvpCounts: Record<string, number> = {}
      for (const event of eventsData) {
        const eventRsvps = await getEventRsvps(event.id)
        rsvpCounts[event.id] = eventRsvps.filter(r => r.status === 'going').length
      }
      setEventRsvpCounts(rsvpCounts)

      // Load activity feed
      const activityData = await getClubActivity(clubId)
      setActivities(activityData)
    } catch (err: any) {
      setError(err.message || 'Failed to load club data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return

    try {
      setIsCreatingEvent(true)
      await createEvent({
        club_id: clubId,
        title: eventTitle,
        event_date: new Date(eventDate).toISOString(),
        location: eventLocation,
        signup_open: true,
      })
      
      setEventTitle('')
      setEventDate('')
      setEventLocation('')
      setShowEventModal(false)
      
      // Reload events
      const eventsData = await getClubEvents(clubId)
      setEvents(eventsData)
      setSuccessMessage('Event created successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleJoinClub = async () => {
    if (!clubId || !user) return

    try {
      if (club?.open_join && !club?.approval_required) {
        await joinOpenClub(clubId)
        setSuccessMessage('You have joined the club!')
      } else {
        await requestJoinClub(clubId)
        setSuccessMessage('Join request sent! Waiting for approval.')
      }
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadClubData()
    } catch (err: any) {
      setError(err.message || 'Failed to join club')
    }
  }

  const handleRsvp = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!user) return

    try {
      await rsvpToEvent(eventId, status)
      setSuccessMessage(`RSVP updated: ${status}`)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Reload RSVPs
      const rsvps = await getMyEventRsvps()
      setMyRsvps(rsvps)
      
      // Update count
      const eventRsvps = await getEventRsvps(eventId)
      setEventRsvpCounts(prev => ({
        ...prev,
        [eventId]: eventRsvps.filter(r => r.status === 'going').length
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to RSVP')
    }
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
      setSuccessMessage('Request approved!')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
      await loadClubData()
    } catch (err: any) {
      setError(err.message || 'Failed to approve request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId)
      setSuccessMessage('Request rejected')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadJoinRequests()
    } catch (err: any) {
      setError(err.message || 'Failed to reject request')
    }
  }

  const getLeaderboard = () => {
    // Calculate wins/losses from matches
    const stats: Record<string, { name: string; wins: number; losses: number; points: number }> = {}
    
    matches.forEach(match => {
      if (!match.score_sets || match.score_sets.length === 0) return
      
      // Get total scores
      let team1Total = 0
      let team2Total = 0
      
      match.score_sets.forEach(set => {
        if (set.team1_score > set.team2_score) team1Total++
        else team2Total++
      })
      
      const team1Won = team1Total > team2Total
      
      // Update stats for each participant
      match.participants?.forEach((p: any) => {
        const name = p.name || p.guest_name || 'Unknown'
        if (!stats[name]) {
          stats[name] = { name, wins: 0, losses: 0, points: 0 }
        }
        
        if (p.team === 1) {
          if (team1Won) {
            stats[name].wins++
            stats[name].points += 3
          } else {
            stats[name].losses++
          }
        } else {
          if (!team1Won) {
            stats[name].wins++
            stats[name].points += 3
          } else {
            stats[name].losses++
          }
        }
      })
    })
    
    return Object.values(stats).sort((a, b) => b.points - a.points)
  }

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = !!myMembership
  const canJoin = user && !isMember && club?.open_join !== false

  if (isLoading || authLoading) {
    return (
      <section className="section-card" style={{ textAlign: 'center' }}>
        <p>Loading...</p>
      </section>
    )
  }

  if (error || !club) {
    return <Navigate to="/not-found" replace />
  }

  const leaderboard = getLeaderboard()

  return (
    <section>
      {successMessage && (
        <div className="modal-toast">{successMessage}</div>
      )}

      <div className="section-card">
        <div className="hero-header">
          <div className="hero-copy">
            <h1 className="page-title">{club.name}</h1>
            <p>{club.description}</p>
            <div className="meta-row" style={{ marginTop: '16px' }}>
              <span>{club.location}</span>
              <span>{club.city}</span>
              <span>{members.length} members</span>
            </div>
            {club.invite_code && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                Invite code: <strong>{club.invite_code}</strong>
              </div>
            )}
            {isAdmin && (
              <div style={{ marginTop: '16px', padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '6px', fontSize: '12px', color: '#1e40af', display: 'inline-block' }}>
                ⚙️ You are a club admin
              </div>
            )}
            {canJoin && (
              <div style={{ marginTop: '16px' }}>
                <button className="brand-button" onClick={handleJoinClub}>
                  {club.approval_required ? 'Request to join' : 'Join club'}
                </button>
              </div>
            )}
            {myMembership?.status === 'active' && (
              <div style={{ marginTop: '16px' }}>
                <span className="tag-pill">✓ Member ({myMembership.role})</span>
              </div>
            )}
          </div>
          <div className="hero-visual">
            <span>🏆</span>
          </div>
        </div>
      </div>

      {/* Admin Action Panel */}
      {isAdmin && (
        <div className="section-card" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe' }}>
          <h3 style={{ marginBottom: '16px' }}>Admin controls</h3>
          <div className="button-panel">
            <button className="brand-button" onClick={() => setShowEventModal(true)}>
              Create event
            </button>
            <button className="small-button" onClick={() => setShowScoreModal(true)}>
              Record score
            </button>
            <button className="small-button" onClick={() => { loadJoinRequests(); setShowJoinRequestsModal(true); }}>
              Join requests {joinRequests.length > 0 && `(${joinRequests.length})`}
            </button>
            <button className="small-button" onClick={() => navigate(`/club/${clubId}/settings`)}>
              Club settings
            </button>
            <button className="small-button" onClick={() => navigate(`/club/${clubId}/members`)}>
              Manage members
            </button>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="grid-2">
          <div className="event-card">
            <h3>Upcoming game days</h3>
            {events.length ? (
              events.map((event) => {
                const myRsvp = myRsvps.find(r => r.event_id === event.id)
                const rsvpCount = eventRsvpCounts[event.id] || 0
                const isFull = event.max_participants && rsvpCount >= event.max_participants
                
                return (
                  <div key={event.id} style={{ marginTop: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <strong>{event.title}</strong>
                    <p>{new Date(event.event_date).toLocaleString()}</p>
                    <p>{event.location}</p>
                    <p style={{ marginTop: '8px', fontSize: '12px', color: event.signup_open ? '#059669' : '#dc2626' }}>
                      {event.signup_open ? '✓ Open for signup' : '✗ Closed'}
                      {event.max_participants && ` • ${rsvpCount}/${event.max_participants} going`}
                    </p>
                    {isMember && event.signup_open && !isFull && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button 
                          className={`small-button ${myRsvp?.status === 'going' ? 'brand-button' : ''}`}
                          onClick={() => handleRsvp(event.id, 'going')}
                        >
                          {myRsvp?.status === 'going' ? '✓ Going' : 'Going'}
                        </button>
                        <button 
                          className={`small-button ${myRsvp?.status === 'maybe' ? 'brand-button' : ''}`}
                          onClick={() => handleRsvp(event.id, 'maybe')}
                        >
                          {myRsvp?.status === 'maybe' ? '✓ Maybe' : 'Maybe'}
                        </button>
                        <button 
                          className={`small-button ${myRsvp?.status === 'not_going' ? 'brand-button' : ''}`}
                          onClick={() => handleRsvp(event.id, 'not_going')}
                        >
                          {myRsvp?.status === 'not_going' ? '✓ Not going' : 'Can\'t go'}
                        </button>
                      </div>
                    )}
                    {isFull && <p style={{ color: '#dc2626', fontSize: '12px' }}>Event full</p>}
                  </div>
                )
              })
            ) : (
              <p className="empty-state">No upcoming game days yet.</p>
            )}
          </div>
          <div className="match-card">
            <h3>Recent scores</h3>
            {matches.length ? (
              matches.map((match) => (
                <div key={match.id} style={{ marginTop: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <strong>{match.title || `${match.sport} match`}</strong>
                  <p>{match.sport} • {match.match_type}</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e40af' }}>
                    {match.score_sets?.map((s: any) => `${s.team1_score}-${s.team2_score}`).join(', ')}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(match.match_date).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="empty-state">No results recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="section-card">
        <h2>Club Leaderboard</h2>
        {leaderboard.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              {leaderboard.slice(0, 10).map((player, index) => (
                <div 
                  key={player.name} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: index < 3 ? '#f0f9ff' : '#f8fafc',
                    borderRadius: '12px',
                    border: index < 3 ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold',
                      color: index === 0 ? '#f59e0b' : index === 1 ? '#64748b' : index === 2 ? '#b45309' : '#94a3b8'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: 600 }}>{player.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                    <span style={{ color: '#059669' }}>{player.wins}W</span>
                    <span style={{ color: '#dc2626' }}>{player.losses}L</span>
                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{player.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="empty-state">No matches recorded yet. Start playing to see the leaderboard!</p>
        )}
      </div>

      {/* Activity Feed */}
      <div className="section-card">
        <h2>Community Activity</h2>
        {activities.length > 0 ? (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '24px' }}>
                  {activity.type === 'match_recorded' && '🏆'}
                  {activity.type === 'member_joined' && '👋'}
                  {activity.type === 'event_created' && '📅'}
                  {activity.type === 'announcement' && '📢'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{activity.title}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                    {activity.description}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    by {activity.actor_name} • {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No recent activity. Start playing to see updates!</p>
        )}
      </div>

      <div className="section-card">
        <div className="grid-2">
          <div className="analysis-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Club members</h3>
              <Link to={`/club/${clubId}/members`} className="small-button">View all</Link>
            </div>
            {members.length ? (
              <div style={{ marginTop: '12px' }}>
                {members.slice(0, 5).map((member) => (
                  <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span>{(member as any).name}</span>
                    <span className="tag-pill">{member.role}</span>
                  </div>
                ))}
                {members.length > 5 && (
                  <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>
                    +{members.length - 5} more members
                  </p>
                )}
              </div>
            ) : (
              <p className="empty-state">No members yet.</p>
            )}
          </div>
          <div className="analysis-card">
            <h3>Club location</h3>
            <p>{club.location}</p>
            <p>{club.city}</p>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showEventModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <h2>Create new event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="modal-form-group">
                <label>Event title *</label>
                <input 
                  type="text" 
                  placeholder="e.g., Wednesday Singles Night"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required 
                  className="form-input"
                />
              </div>
              <div className="modal-form-group">
                <label>Date & Time *</label>
                <input 
                  type="datetime-local" 
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required 
                  className="form-input"
                />
              </div>
              <div className="modal-form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  placeholder="e.g., Court 2"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="small-button" 
                  onClick={() => setShowEventModal(false)}
                  disabled={isCreatingEvent}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="brand-button"
                  disabled={isCreatingEvent}
                >
                  {isCreatingEvent ? 'Creating...' : 'Create event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Requests Modal */}
      {showJoinRequestsModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowJoinRequestsModal(false)}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <h2>Join Requests</h2>
            {isLoadingRequests ? (
              <p>Loading...</p>
            ) : joinRequests.length === 0 ? (
              <p className="empty-state">No pending join requests.</p>
            ) : (
              <div style={{ marginTop: '16px' }}>
                {joinRequests.map((request) => (
                  <div key={request.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <strong>{(request as any).name}</strong>
                      <p style={{ fontSize: '14px', color: '#64748b' }}>{(request as any).email}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="small-button brand-button"
                        onClick={() => handleApproveRequest(request.id)}
                      >
                        Approve
                      </button>
                      <button 
                        className="small-button"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score Recording Modal */}
      <ScoreRecordingModal 
        isOpen={showMemberScoreModal} 
        onClose={() => setShowMemberScoreModal(false)} 
        clubId={club.id}
        onScoreRecorded={loadClubData}
      />

      {/* Record Score Modal for admins */}
      {showScoreModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowScoreModal(false)}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <h2>Record match score</h2>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              Use the full score recording form for detailed match entry.
            </p>
            <button 
              className="brand-button" 
              onClick={() => {
                setShowScoreModal(false)
                setShowMemberScoreModal(true)
              }}
            >
              Open score recorder
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
