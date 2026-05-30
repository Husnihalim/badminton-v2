import { Link } from 'react-router-dom'
import type { Club } from '../types'

interface ClubCardProps {
  club: Club
}

export default function ClubCard({ club }: ClubCardProps) {
  return (
    <Link to={`/club/${club.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className="preview-card">
        <h3>{club.name}</h3>
        <p>{club.description}</p>
        <div className="meta-row">
          <span>{club.city}</span>
          <span>{club.membersCount} members</span>
        </div>
        <div className="hero-actions" style={{ marginTop: '14px' }}>
          {club.sportFocus.map((sport) => (
            <span key={sport} className="tag-pill">
              {sport}
            </span>
          ))}
        </div>
      </article>
    </Link>
  )
}
