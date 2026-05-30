import { useParams, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { getClub, getClubMembers, getClubEvents, getClubMatches, getMyMembership, createEvent } from '../lib/api'
import type { Club, ClubEvent, MatchWithDetails, Membership } from '../types'

export default function ClubHomePage() {
  const { clubId } = useParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [myMembership, setMyMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [showEventModal, setShowEventModal] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showMemberScoreModal, setShowMemberScoreModal] = useState(false)
  
  // Event creation form
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)

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
    } catch (err: any) {
      alert('Failed to create event: ' + err.message)
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = !!myMembership

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

  return (
    <section>
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
            {isAdmin && (
              <div style={{ marginTop: '16px', padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '6px', fontSize: '12px', color: '#1e40af', display: 'inline-block' }}>
                ⚙️ You are a club admin
              </div>
            )}
            {!isMember && user && (
              <div style={{ marginTop: '16px' }}>
                <button className="brand-button">
                  Join club
                </button>
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
            <button className="small-button">Manage members</button>
            <button className="small-button">Club settings</button>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="grid-2">
          <div className="event-card">
            <h3>Upcoming game days</h3>
            {events.length ? (
              events.map((event) => (
                <div key={event.id} style={{ marginTop: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <strong>{event.title}</strong>
                  <p>{new Date(event.event_date).toLocaleString()}</p>
                  <p>{event.location}</p>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: event.signup_open ? '#059669' : '#dc2626' }}>
                    {event.signup_open ? '✓ Open for signup' : '✗ Closed'}
                  </p>
                  {isMember && event.signup_open && (
                    <button className="small-button" style={{ marginTop: '8px' }}>
                      Sign up
                    </button>
                  )}
                </div>
              ))
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

      <div className="section-card">
        <div className="grid-2">
          <div className="analysis-card">
            <h3>Club members</h3>
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

      {/* Score Recording Modal - Available to all members */}
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
