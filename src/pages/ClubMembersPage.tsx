import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shield, Trash2, UserRound, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getClub, getClubMembers, getMyMembership, removeMember, updateMemberRole } from '../lib/api'
import type { Club, Membership } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'
import { Select } from '../components/ui/select'

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function roleBadgeClass(role: Membership['role']) {
  if (role === 'owner') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (role === 'admin') return 'border-blue-200 bg-blue-50 text-blue-800'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

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

  const loadClubData = useCallback(async () => {
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
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load club data'))
    } finally {
      setIsLoading(false)
    }
  }, [clubId, user])

  useEffect(() => {
    if (clubId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadClubData()
    }
  }, [clubId, loadClubData])

  const handleRoleChange = async (member: Membership, newRole: 'owner' | 'admin' | 'member') => {
    if (!clubId) return
    
    try {
      await updateMemberRole(clubId, member.user_id, newRole)
      setSuccessMessage(`${member.name}'s role updated to ${newRole}.`)
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadClubData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update role'))
    }
  }

  const handleRemoveMember = async () => {
    if (!clubId || !memberToRemove) return
    
    try {
      setIsRemoving(true)
      await removeMember(clubId, memberToRemove.user_id)
      setSuccessMessage(`${memberToRemove.name} has been removed from the club.`)
      setTimeout(() => setSuccessMessage(''), 3000)
      setMemberToRemove(null)
      await loadClubData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member'))
    } finally {
      setIsRemoving(false)
    }
  }

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isOwner = myMembership?.role === 'owner' || user?.role === 'superadmin'

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    return roleOrder[a.role] - roleOrder[b.role]
  })

  if (isLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
      </Card>
    )
  }

  if (error || !club) return <Navigate to="/not-found" replace />

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}

      <PageHeader
        eyebrow="Members"
        title="Club members"
        description={`${members.length} member${members.length !== 1 ? 's' : ''} in ${club.name}`}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/club/${clubId}`)}>
            <ArrowLeft size={17} aria-hidden="true" />
            Back
          </Button>
        }
      />

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <Card>
        <CardContent className="space-y-3 pt-4 sm:pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Users size={18} aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold text-slate-950">Roster</h2>
          </div>

          {sortedMembers.length ? (
            <div className="space-y-3">
              {sortedMembers.map((member) => (
                <div key={member.id} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                      <UserRound size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold text-slate-950">{member.name || 'Unknown member'}</h3>
                        <Badge className={roleBadgeClass(member.role)}>{member.role}</Badge>
                        {member.user_id === user?.id ? <span className="text-xs font-semibold text-slate-500">You</span> : null}
                      </div>
                      <p className="break-words text-sm text-slate-600">{member.email}</p>
                      <p className="text-xs text-slate-500">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {isAdmin && member.user_id !== user?.id && member.role !== 'owner' ? (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                      {isOwner ? (
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as 'admin' | 'member')}
                          className="min-w-32"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </Select>
                      ) : null}
                      <Button variant="secondary" type="button" onClick={() => setMemberToRemove(member)}>
                        <Trash2 size={16} aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No members yet.</p>
          )}
        </CardContent>
      </Card>

      {memberToRemove ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => !isRemoving && setMemberToRemove(null)}>
          <Card className="w-full rounded-b-none sm:max-w-md sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                    <Shield size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Remove member</h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Remove <strong>{memberToRemove.name}</strong> from this club. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setMemberToRemove(null)} aria-label="Close" disabled={isRemoving}>
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={() => setMemberToRemove(null)} disabled={isRemoving}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={handleRemoveMember} disabled={isRemoving}>
                  {isRemoving ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Page>
  )
}
