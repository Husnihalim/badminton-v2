import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getClub, getMyMembership, updateClub, regenerateInviteCode } from '../lib/api'
import type { Club, Membership } from '../types'

export default function ClubSettingsPage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [club, setClub] = useState<Club | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [openJoin, setOpenJoin] = useState(true)
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    if (clubId) {
      loadClubData()
    }
  }, [clubId, user])

  const loadClubData = async () => {
    if (!clubId) return
    
    try {
      setIsLoading(true)
      setError('')
      
      const [clubData, membershipData] = await Promise.all([
        getClub(clubId),
        user ? getMyMembership(clubId) : Promise.resolve(null),
      ])

      if (!clubData) {
        setError('Club not found')
        return
      }

      setClub(clubData)
      setMembership(membershipData)
      
      // Populate form
      setName(clubData.name)
      setDescription(clubData.description || '')
      setLocation(clubData.location || '')
      setCity(clubData.city || '')
      setOpenJoin(clubData.open_join !== false)
      setApprovalRequired(clubData.approval_required || false)
      setInviteCode(clubData.invite_code || '')
    } catch (err: any) {
      setError(err.message || 'Failed to load club data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return

    try {
      setIsSaving(true)
      setError('')
      
      await updateClub(clubId, {
        name,
        description: description || undefined,
        location: location || undefined,
        city: city || undefined,
        open_join: openJoin,
        approval_required: approvalRequired,
      })
      
      setSuccessMessage('Club settings saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerateCode = async () => {
    if (!clubId) return
    
    try {
      const newCode = await regenerateInviteCode(clubId)
      setInviteCode(newCode || '')
      setSuccessMessage('New invite code generated!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to generate new code')
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setSuccessMessage('Invite code copied to clipboard!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin' || user?.role === 'superadmin'

  if (isLoading) {
    return (
      <section className="section-card" style={{ textAlign: 'center' }}>
        <p>Loading...</p>
      </section>
    )
  }

  if (error || !club) {
    return <Navigate to="/not-found" replace />
  }

  if (!isAdmin) {
    return <Navigate to={`/club/${clubId}`} replace />
  }

  return (
    <section>
      {successMessage && (
        <div className="modal-toast">{successMessage}</div>
      )}

      <div className="section-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button 
            className="small-button" 
            onClick={() => navigate(`/club/${clubId}`)}
          >
            ← Back to club
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>Club Settings</h1>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div>
              <h3 style={{ marginBottom: '16px' }}>Basic Information</h3>
              
              <div className="modal-form-group">
                <label>Club Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="modal-form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="form-input"
                  placeholder="What is your club about?"
                />
              </div>

              <div className="modal-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Community Center Court"
                />
              </div>

              <div className="modal-form-group">
                <label>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Kuala Lumpur"
                />
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: '16px' }}>Join Settings</h3>
              
              <div className="modal-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={openJoin}
                    onChange={(e) => setOpenJoin(e.target.checked)}
                  />
                  Allow new members to join
                </label>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                  When disabled, only invite codes work
                </p>
              </div>

              <div className="modal-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={approvalRequired}
                    onChange={(e) => setApprovalRequired(e.target.checked)}
                    disabled={!openJoin}
                  />
                  Require approval for new members
                </label>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                  Admins must approve each join request
                </p>
              </div>

              <div className="modal-form-group">
                <label>Invite Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="form-input"
                    style={{ fontFamily: 'monospace', letterSpacing: '2px' }}
                  />
                  <button
                    type="button"
                    className="small-button"
                    onClick={handleCopyCode}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="small-button"
                    onClick={handleRegenerateCode}
                  >
                    New
                  </button>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                  Share this code to let people join instantly
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
            <button
              type="button"
              className="small-button"
              onClick={() => navigate(`/club/${clubId}`)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="brand-button"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {membership?.role === 'owner' && (
        <div className="section-card" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>Danger Zone</h3>
          <p style={{ color: '#7f1d1d', marginBottom: '16px' }}>
            These actions are irreversible. Please be careful.
          </p>
          <button
            className="small-button"
            style={{ backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}
            onClick={() => alert('Transfer ownership feature coming soon')}
          >
            Transfer Ownership
          </button>
        </div>
      )}
    </section>
  )
}
