import { Link } from 'react-router-dom'
import ClubCard from '../components/ClubCard'
import { sampleClubs } from '../data/mock'

export default function LandingPage() {
  return (
    <section>
      <div className="hero-banner">
        <div className="hero-header">
          <div className="hero-copy">
            <p className="tag-pill">Racket club scoring made simple</p>
            <h1 className="page-title">Run your racket sport club with score, events, and members in one place.</h1>
            <p>
              Create clubs, record singles or doubles results, manage game days, and keep members engaged with a
              mobile-first workflow built for modern coaches and club admins.
            </p>
            <div className="hero-actions">
              <Link className="brand-button" to="/register">
                Get started
              </Link>
              <Link className="small-button" to="/login">
                Log in
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <span>🎾</span>
          </div>
        </div>
      </div>

      <div className="trust-strip">
        <div className="trust-card">
          <strong>Trusted by clubs</strong>
          <p>Launched for badminton, tennis, and pickleball organizers.</p>
        </div>
        <div className="trust-card">
          <strong>Fast setup</strong>
          <p>Set up your first event and roster in under five minutes.</p>
        </div>
        <div className="trust-card">
          <strong>Mobile-first</strong>
          <p>Designed for on-court score capture and member management.</p>
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
            <p>Track members, approvals, social links, and club activity from one dashboard.</p>
          </div>
          <div className="preview-card">
            <h3>Score capture</h3>
            <p>Record casual and tournament matches, with automatic scoreboard and ranking updates.</p>
          </div>
          <div className="preview-card">
            <h3>Attendance & events</h3>
            <p>Create game days, manage RSVPs, and keep members notified about upcoming sessions.</p>
          </div>
          <div className="preview-card">
            <h3>Leaderboards</h3>
            <p>Surface top players, recent results, and tournament standings for your club.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
