import { sampleAnalytics, sampleEvents, sampleMatches, sampleMembers } from '../data/mock'

export default function DashboardPage() {
  return (
    <section>
      <div className="section-card">
        <h1 className="page-title">My dashboard</h1>
        <p>Quick access to your clubs, upcoming game days, and recent results.</p>
      </div>

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
