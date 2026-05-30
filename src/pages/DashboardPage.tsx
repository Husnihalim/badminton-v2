import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { useAuth } from '../context/AuthContext'
import { sampleAnalytics, sampleClubs, sampleEvents, sampleMatches, sampleMembers } from '../data/mock'

export default function DashboardPage() {
  const [showScoreModal, setShowScoreModal] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

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

      <ScoreRecordingModal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} />

      <div className="stat-row">
        {sampleAnalytics.map((item) => (
          <div key={item.title} className="stat-item">
            <strong>{item.title}</strong>
            <span className="stat-value">{item.value}</span>
            <p>{item.description}</p>
          </div>
        ))}
      </div>

      <div className="section-card">
        <h2>Your clubs</h2>
        <div className="card-grid">
          {sampleClubs.map((club) => (
            <div key={club.id} className="listing-card">
              <h3>{club.name}</h3>
              <p>{club.description}</p>
              <div className="meta-row" style={{ marginTop: '12px' }}>
                <span>{club.city}</span>
                <span>{club.membersCount} members</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h2>Upcoming game days</h2>
        <div className="preview-list">
          {sampleEvents.map((event) => (
            <div key={event.id} className="event-card">
              <h3>{event.title}</h3>
              <p>{event.date}</p>
              <p>{event.location}</p>
              <p style={{ marginTop: '10px', color: '#0f172a' }}>
                {event.signupOpen ? 'Open for signup' : 'Closed'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h2>Recent match results</h2>
        <div className="preview-list">
          {sampleMatches.map((match) => (
            <div key={match.id} className="match-card">
              <h3>{match.title}</h3>
              <p>{match.sport}</p>
              <p>{match.result}</p>
              <p>Recorded by {match.recordedBy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h2>Recent members</h2>
        <div className="preview-list">
          {sampleMembers.map((member) => (
            <div key={member.id} className="member-card">
              <h3>{member.name}</h3>
              <p>{member.role}</p>
              <p>Joined {member.joinedAt}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
