import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyClubs, createClub } from '../lib/api'
import type { Club } from '../types'

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateClubModal, setShowCreateClubModal] = useState(false)
  const [clubName, setClubName] = useState('')
  const [clubDescription, setClubDescription] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }

    if (user) {
      loadMyClubs()
    }
  }, [user, authLoading, navigate])

  const loadMyClubs = async () => {
    try {
      setIsLoading(true)
      const myClubs = await getMyClubs()
      setClubs(myClubs)
    } catch (err) {
      console.error('Error loading clubs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!clubName.trim()) {
      setError('Club name is required')
      return
    }

    try {
      setIsCreating(true)
      const newClub = await createClub({
        name: clubName.trim(),
        description: clubDescription.trim(),
        city: clubCity.trim(),
        sport_focus: ['badminton'],
        open_join: true,
        approval_required: false,
      })
      
      if (newClub) {
        setClubName('')
        setClubDescription('')
        setClubCity('')
        setShowCreateClubModal(false)
        await loadMyClubs()
        navigate(`/club/${newClub.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create club')
    } finally {
      setIsCreating(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <section className="section-card" style={{ textAlign: 'center' }}>
        <p>Loading...</p>
      </section>
    )
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
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <span className="tag-pill">{(club as any).role || 'member'}</span>
                  </div>
                </div>
              </Link>
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
        <div className="modal-overlay" onClick={() => setShowCreateClubModal(false)}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <h2>Create new club</h2>
            {error && (
              <div style={{ color: '#dc2626', marginBottom: '12px', fontSize: '14px' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreateClub}>
              <div className="modal-form-group">
                <label>Club name *</label>
                <input
                  type="text"
                  placeholder="e.g., Ace Smash Badminton Club"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="modal-form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="What is your club about?"
                  value={clubDescription}
                  onChange={(e) => setClubDescription(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-form-group">
                <label>City</label>
                <input
                  type="text"
                  placeholder="e.g., Kuala Lumpur"
                  value={clubCity}
                  onChange={(e) => setClubCity(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="small-button" 
                  onClick={() => setShowCreateClubModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="brand-button"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
