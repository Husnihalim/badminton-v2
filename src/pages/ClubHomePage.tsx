import { useParams, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { sampleClubs, sampleEvents, sampleMatches } from '../data/mock'

export default function ClubHomePage() {
  const { clubId } = useParams()
  const { user } = useAuth()
  const club = sampleClubs.find((item) => item.id === clubId)

  if (!club) {
    return <Navigate to="/not-found" replace />
  }

  const events = sampleEvents.filter((item) => item.clubId === club.id)
  const matches = sampleMatches.filter((item) => item.clubId === club.id)
  
  // For demo: superadmin or owner of club-1 and club-3 are admins
  const isAdmin = user?.role === 'superadmin' || (user && ['club-1', 'club-3'].includes(club.id))
  
  const [showEventModal, setShowEventModal] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showMemberScoreModal, setShowMemberScoreModal] = useState(false)

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
              <span>{club.membersCount} members</span>
            </div>
            {isAdmin && (
              <div style={{ marginTop: '16px', padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '6px', fontSize: '12px', color: '#1e40af', display: 'inline-block' }}>
                ⚙️ You are a club admin
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
                  <p>{event.date}</p>
                  <p>{event.location}</p>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: event.signupOpen ? '#059669' : '#dc2626' }}>
                    {event.signupOpen ? '✓ Open for signup' : '✗ Closed'}
                  </p>
                  {!isAdmin && (
                    <button className="small-button" style={{ marginTop: '8px' }}>
                      {event.signupOpen ? 'Sign up' : 'View'}
                    </button>
                  )}
                  {!isAdmin && (
                    <button className="small-button" style={{ marginTop: '8px' }} onClick={() => setShowMemberScoreModal(true)}>
                      Record score
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
                  <strong>{match.title}</strong>
                  <p>{match.sport}</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e40af' }}>{match.result}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{match.date}</p>
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
            <h3>Club ranking snapshot</h3>
            <p>Top players are ranked automatically based on recent match data.</p>
            <div className="stat-row" style={{ marginTop: '16px' }}>
              <div className="stat-item">
                <strong>Top singles</strong>
                <span className="stat-value">Aisha K.</span>
              </div>
              <div className="stat-item">
                <strong>Top doubles</strong>
                <span className="stat-value">Team Smash</span>
              </div>
            </div>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%' }}>
            <h2>Create new event</h2>
            <form onSubmit={(e) => { e.preventDefault(); alert('Event created! (Demo)'); setShowEventModal(false); }}>
              <input type="text" placeholder="Event title" required style={{ marginTop: '16px', marginBottom: '12px' }} />
              <input type="datetime-local" required style={{ marginBottom: '12px' }} />
              <input type="text" placeholder="Location/Court" required style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button type="button" className="small-button" onClick={() => setShowEventModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="brand-button">
                  Create event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Score Recording Modal - Available to all members */}
      <ScoreRecordingModal isOpen={showMemberScoreModal} onClose={() => setShowMemberScoreModal(false)} clubId={club.id} />

      {/* Record Score Modal for admins */}
      {showScoreModal && isAdmin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%' }}>
            <h2>Record match score</h2>
            <form onSubmit={(e) => { e.preventDefault(); alert('Score recorded! (Demo)'); setShowScoreModal(false); }}>
              <input type="text" placeholder="Match title" required style={{ marginTop: '16px', marginBottom: '12px' }} />
              <input type="text" placeholder="Result (e.g., 21-17)" required style={{ marginBottom: '12px' }} />
              <input type="text" placeholder="Recorded by" required style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button type="button" className="small-button" onClick={() => setShowScoreModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="brand-button">
                  Record score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

