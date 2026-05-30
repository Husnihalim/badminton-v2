import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { sampleClubs } from '../data/mock'

export default function ProfilePage() {
  const { user } = useAuth()
  const [showCreateClubModal, setShowCreateClubModal] = useState(false)
  const [clubName, setClubName] = useState('')

  // Simulated: clubs owned/managed by this user
  const userClubs = sampleClubs.filter((club) => {
    // In a real app, this would check club ownership
    return club.id === 'club-1' || club.id === 'club-3'
  })

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would create a new club via API
    alert(`Club "${clubName}" created! (Demo mode)`)
    setClubName('')
    setShowCreateClubModal(false)
  }

  return (
    <section>
      <div className="section-card">
        <div className="hero-header">
          <div className="hero-copy">
            <h1 className="page-title">My Profile</h1>
            <p>{user?.name}</p>
            <p style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
              {user?.email} • Role: <strong>{user?.role}</strong>
            </p>
          </div>
          <div className="hero-visual">
            <span style={{ fontSize: '48px' }}>👤</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>My Clubs</h2>
          <button className="brand-button" onClick={() => setShowCreateClubModal(true)}>
            Create new club
          </button>
        </div>

        {userClubs.length ? (
          <div className="card-grid">
            {userClubs.map((club) => (
              <div key={club.id} className="listing-card">
                <h3>{club.name}</h3>
                <p>{club.description}</p>
                <div className="meta-row" style={{ marginTop: '12px' }}>
                  <span>{club.city}</span>
                  <span>{club.membersCount} members</span>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button className="small-button">Manage</button>
                  <button className="small-button">Settings</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            <p>You don't own any clubs yet.</p>
            <button className="brand-button" onClick={() => setShowCreateClubModal(true)} style={{ marginTop: '12px' }}>
              Create one now
            </button>
          </div>
        )}
      </div>

      {/* Create Club Modal */}
      {showCreateClubModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%' }}>
            <h2>Create new club</h2>
            <form onSubmit={handleCreateClub}>
              <input
                type="text"
                placeholder="Club name"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                required
                style={{ marginTop: '16px', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button type="button" className="small-button" onClick={() => setShowCreateClubModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="brand-button">
                  Create club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
