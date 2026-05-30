import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { useAuth } from '../context/AuthContext'
import { getMyClubs, getClubEvents, getClubMatches } from '../lib/api'
import type { Club, ClubEvent, MatchWithDetails } from '../types'

export default function DashboardPage() {
  const [showScoreModal, setShowScoreModal] = useState(false)
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      return
    }

    if (user) {
      loadDashboardData()
    }
  }, [user, authLoading])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Get user's clubs
      const myClubs = await getMyClubs()
      setClubs(myClubs)
      
      // Get events and matches from all user's clubs
      const allEvents: ClubEvent[] = []
      const allMatches: MatchWithDetails[] = []
      
      for (const club of myClubs) {
        const [clubEvents, clubMatches] = await Promise.all([
          getClubEvents(club.id),
          getClubMatches(club.id),
        ])
        
        // Add club name to events for display
        allEvents.push(...clubEvents.map(e => ({ ...e, clubName: club.name })))
        allMatches.push(...clubMatches.map(m => ({ ...m, clubName: club.name })))
      }
      
      // Sort events by date (upcoming first)
      allEvents.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      
      // Sort matches by date (most recent first)
      allMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setEvents(allEvents.slice(0, 5))
      setMatches(allMatches.slice(0, 5))
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <section className="section-card" style={{ textAlign: 'center' }}>
        <p>Loading...</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="section-card" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Welcome to KelabSukan</h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Please log in to view your dashboard and record match scores.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="brand-button" onClick={() => navigate('/login')}>
            Log in
          </button>
          <button className="small-button" onClick={() => navigate('/register')}>
            Sign up
          </button>
        </div>
      </section>
    )
  }

  // Calculate stats
  const totalMatches = matches.length
  const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date()).length
  const clubCount = clubs.length

  return (
    <section>
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Welcome back</h1>
            <p>Your racket sport hub: view clubs, upcoming events, and match results all in one place.</p>
          </div>
          <button className="brand-button" onClick={() => setShowScoreModal(true)} style={{ height: 'fit-content' }}>
            Record score
          </button>
        </div>
      </div>

      <ScoreRecordingModal 
        isOpen={showScoreModal} 
        onClose={() => setShowScoreModal(false)} 
        onScoreRecorded={loadDashboardData}
      />

      <div className="stat-row">
        <div className="stat-item">
          <strong>Your clubs</strong>
          <span className="stat-value">{clubCount}</span>
          <p>Clubs you're a member of</p>
        </div>
        <div className="stat-item">
          <strong>Upcoming events</strong>
          <span className="stat-value">{upcomingEvents}</span>
          <p>Game days and sessions</p>
        </div>
        <div className="stat-item">
          <strong>Matches recorded</strong>
          <span className="stat-value">{totalMatches}</span>
          <p>Across all your clubs</p>
        </div>
      </div>

      <div className="section-card">
        <h2>Your clubs</h2>
        {clubs.length ? (
          <div className="card-grid">
            {clubs.map((club) => (
              <Link 
                key={club.id} 
                to={`/club/${club.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="listing-card">
                  <h3>{club.name}</h3>
                  <p>{club.description}</p>
                  <div className="meta-row" style={{ marginTop: '12px' }}>
                    <span>{club.city}</span>
                    <span>{club.membersCount} members</span>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <span className="tag-pill">{(club as any).role || 'member'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            <p>You haven't joined any clubs yet.</p>
            <Link to="/" className="brand-button" style={{ marginTop: '12px', display: 'inline-block' }}>
              Find clubs
            </Link>
          </div>
        )}
      </div>

      <div className="section-card">
        <h2>Upcoming game days</h2>
        {events.length ? (
          <div className="preview-list">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <h3>{event.title}</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {(event as any).clubName}
                </p>
                <p>{new Date(event.event_date).toLocaleString()}</p>
                <p>{event.location}</p>
                <p style={{ marginTop: '10px', color: event.signup_open ? '#059669' : '#dc2626' }}>
                  {event.signup_open ? '✓ Open for signup' : '✗ Closed'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No upcoming events.</p>
        )}
      </div>

      <div className="section-card">
        <h2>Recent match results</h2>
        {matches.length ? (
          <div className="preview-list">
            {matches.map((match) => (
              <div key={match.id} className="match-card">
                <h3>{match.title || `${match.sport} match`}</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {(match as any).clubName}
                </p>
                <p>{match.sport} • {match.match_type}</p>
                <p style={{ fontWeight: 600, color: '#2563eb' }}>
                  {match.score_sets?.map((s) => `${s.team1_score}-${s.team2_score}`).join(', ')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No matches recorded yet.</p>
        )}
      </div>
    </section>
  )
}
