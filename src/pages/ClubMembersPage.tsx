import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  getClub, 
  getClubMembers, 
  getMyMembership, 
  updateMemberRole, 
  removeMember 
} from '../lib/api'
import type { Club, Membership } from '../types'

export default function ClubMembersPage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [myMembership, setMyMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

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
      
      const [clubData, membersData, membershipData] = await Promise.all([
        getClub(clubId),
        getClubMembers(clubId),
        user ? getMyMembership(clubId) : Promise.resolve(null),
      ])

      if (!clubData) {
        setError('Club not found')
        return
      }

      setClub(clubData)
      setMembers(membersData)
      setMyMembership(membershipData)
    } catch (err: any) {
      setError(err.message || 'Failed to load club data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (member: Membership, newRole: 'owner' | 'admin' | 'member') => {
    if (!clubId) return
    
    try {
      await updateMemberRole(clubId, member.user_id, newRole)
      setSuccessMessage(`${member.name}'s role updated to ${newRole}`)
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadClubData()
    } catch (err: any) {
      setError(err.message || 'Failed to update role')
    }
  }

  const handleRemoveMember = async () => {
    if (!clubId || !memberToRemove) return
    
    try {
      setIsRemoving(true)
      await removeMember(clubId, memberToRemove.user_id)
      setSuccessMessage(`${memberToRemove.name} has been removed from the club`)
      setTimeout(() => setSuccessMessage(''), 3000)
      setMemberToRemove(null)
      await loadClubData()
    } catch (err: any) {
      setError(err.message || 'Failed to remove member')
    } finally {
      setIsRemoving(false)
    }
  }

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isOwner = myMembership?.role === 'owner' || user?.role === 'superadmin'

  // Sort members: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    return roleOrder[a.role] - roleOrder[b.role]
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return '#f59e0b'
      case 'admin': return '#3b82f6'
      default: return '#64748b'
    }
  }

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
          <h1 className="page-title" style={{ margin: 0 }}>Club Members</h1>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#64748b' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} in {club.name}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedMembers.map((member) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#475569',
                  }}
                >
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{member.name}</strong>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        backgroundColor: getRoleBadgeColor(member.role),
                        color: 'white',
                      }}
                    >
                      {member.role}
                    </span>
                    {member.user_id === user?.id && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>(You)</span>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                    {member.email}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isOwner && (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value as 'admin' | 'member')}
                      className="form-input"
                      style={{ width: 'auto', padding: '8px 12px' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  <button
                    className="small-button"
                    style={{ color: '#dc2626' }}
                    onClick={() => setMemberToRemove(member)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '48px' }}>
            <p>No members yet.</p>
          </div>
        )}
      </div>

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div 
          className="modal-overlay" 
          onClick={() => !isRemoving && setMemberToRemove(null)}
        >
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Remove Member</h3>
            <p style={{ marginTop: '16px', color: '#64748b' }}>
              Are you sure you want to remove <strong>{memberToRemove.name}</strong> from the club?
            </p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#dc2626' }}>
              This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button
                className="small-button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                className="brand-button"
                style={{ backgroundColor: '#dc2626' }}
                onClick={handleRemoveMember}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
