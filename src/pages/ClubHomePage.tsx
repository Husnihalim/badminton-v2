import { useParams } from 'react-router-dom'
import { sampleClubs, sampleEvents, sampleMatches } from '../data/mock'

export default function ClubHomePage() {
  const { clubId } = useParams()
  const club = sampleClubs.find((item) => item.id === clubId) ?? sampleClubs[0]
  const events = sampleEvents.filter((item) => item.clubId === club.id)
  const matches = sampleMatches.filter((item) => item.clubId === club.id)

  return (
    <section>
      <div className="section-card">
        <h1 className="page-title">{club.name}</h1>
        <p>{club.description}</p>
        <div className="meta-row" style={{ marginTop: '16px' }}>
          <span>{club.location}</span>
          <span>{club.city}</span>
          <span>{club.membersCount} members</span>
        </div>
      </div>

      <div className="section-card">
        <h2>Club home</h2>
        <div className="grid-2" style={{ marginTop: '18px' }}>
          <div className="event-card">
            <h3>Upcoming events</h3>
            {events.length ? (
              events.map((event) => (
                <div key={event.id} style={{ marginTop: '16px' }}>
                  <strong>{event.title}</strong>
                  <p>{event.date}</p>
                  <p>{event.location}</p>
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
                <div key={match.id} style={{ marginTop: '16px' }}>
                  <strong>{match.title}</strong>
                  <p>{match.result}</p>
                  <p>{match.date}</p>
                </div>
              ))
            ) : (
              <p className="empty-state">No results recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
