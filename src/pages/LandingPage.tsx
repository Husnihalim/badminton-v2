import { Link } from 'react-router-dom'
import ClubCard from '../components/ClubCard'
import { sampleClubs } from '../data/mock'

export default function LandingPage() {
  return (
    <section>
      <div className="hero-banner">
        <div>
          <p className="tag-pill">Racket club scoring made simple</p>
          <h1 className="page-title">Run your racket sport club with score, events, and members in one place.</h1>
          <p>
            Create clubs, record singles or doubles results, manage game days, and keep members engaged with a
            mobile-first workflow.
          </p>
          <div className="hero-actions">
            <Link className="brand-button" to="/register">
              Create a club
            </Link>
            <Link className="small-button" to="/login">
              Log in
            </Link>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2>Featured demo clubs</h2>
        <div className="preview-list">
          {sampleClubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      </div>

      <div className="section-card">
        <h2>What the app covers</h2>
        <div className="card-grid">
          <div className="preview-card">
            <h3>Club management</h3>
            <p>Track members, approvals, social links, and location-based club discovery.</p>
          </div>
          <div className="preview-card">
            <h3>Score capture</h3>
            <p>Record one-set casual matches or tournament multi-set results for singles and doubles.</p>
          </div>
          <div className="preview-card">
            <h3>Attendance & events</h3>
            <p>Create game days, let members RSVP, and sync events with their calendars.</p>
          </div>
          <div className="preview-card">
            <h3>Leaderboards</h3>
            <p>Show player rankings, recent results, and club analytics on the home page.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
