import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Shield, Trash2, UserRound, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { updateMemberRole, removeMember } from '../../../lib/api'
import { useQueryClient } from '@tanstack/react-query'
import type { Membership } from '../../../types'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Card, CardContent } from '../../../components/ui/card'

interface ClubMembersRosterProps {
  clubId: string
  clubName: string
  members: Membership[]
  myMembership: Membership | null
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
}

export function ClubMembersRoster({
  clubId,
  clubName,
  members,
  myMembership,
  setSuccessMessage,
  setActionError
}: ClubMembersRosterProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isOwner = myMembership?.role === 'owner' || user?.role === 'superadmin'

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      (member.name || '').toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query)
    )
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    return roleOrder[a.role] - roleOrder[b.role]
  })

  const handleRoleChange = async (member: Membership, newRole: 'owner' | 'admin' | 'member') => {
    try {
      await updateMemberRole(clubId, member.user_id, newRole)
      setSuccessMessage(`${member.name}'s role updated to ${newRole}.`)
      setTimeout(() => setSuccessMessage(''), 3000)
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'membership'] })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update role')
      setTimeout(() => setActionError(''), 4000)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return
    try {
      setIsRemoving(true)
      await removeMember(clubId, memberToRemove.user_id)
      setMemberToRemove(null)
      setSuccessMessage(`${memberToRemove.name} has been removed from the club.`)
      setTimeout(() => setSuccessMessage(''), 3000)
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'membership'] })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove member')
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setIsRemoving(false)
    }
  }

  const roleBadgeClass = (role: Membership['role']) => {
    if (role === 'owner') return 'border-amber-250 bg-amber-500/10 text-amber-500 font-bold border'
    if (role === 'admin') return 'border-blue-250 bg-blue-500/10 text-blue-400 font-bold border'
    return 'border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] border'
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Roster ({members.length} members)</h2>
          </div>

          <div className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--arena-text-dim)]" size={16} aria-hidden="true" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
              placeholder="Search members by name or email..."
            />
          </div>

          {sortedMembers.length ? (
            <div className="space-y-3">
              {sortedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] p-2 px-3 sm:p-2.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {member.user_id ? (
                      <Link to={`/member/${member.user_id}`} className="shrink-0 flex items-center">
                        {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.name || 'Member'} 
                            className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm border border-[var(--arena-border)]"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] shadow-sm border border-[var(--arena-border)]">
                            <UserRound size={16} aria-hidden="true" />
                          </span>
                        )}
                      </Link>
                    ) : (
                      member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.name || 'Member'} 
                          className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm border border-[var(--arena-border)]"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] shadow-sm border border-[var(--arena-border)]">
                          <UserRound size={16} aria-hidden="true" />
                        </span>
                      )
                    )}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <h3 className="truncate font-bold text-[var(--arena-text)] text-sm sm:text-base">
                          {member.user_id ? (
                            <Link to={`/member/${member.user_id}`} className="hover:underline text-[var(--arena-accent)]">
                              {member.name || 'Unknown member'}
                            </Link>
                          ) : (
                            <span className="text-[var(--arena-text)]">
                              {member.name || 'Unknown member'} (Guest)
                            </span>
                          )}
                        </h3>
                        <Badge className={`${roleBadgeClass(member.role)} text-[10px] px-1.5 py-0`}>{member.role}</Badge>
                        {member.user_id === user?.id ? <span className="text-[10px] font-semibold text-[var(--arena-text-dim)]">You</span> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--arena-text-muted)]">
                        <span className="truncate max-w-[150px] sm:max-w-[240px] md:max-w-none">{member.email}</span>
                        <span className="text-[10px] text-[var(--arena-text-dim)]">•</span>
                        <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && member.user_id !== user?.id && member.role !== 'owner' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as 'admin' | 'member')}
                          className="h-8 min-h-8 w-24 sm:w-28 py-0.5 px-2 text-xs"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </Select>
                      ) : null}
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-8 w-8 min-h-8 p-0 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        title="Remove member"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
              {searchQuery ? `No members found matching "${searchQuery}"` : 'No members yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {memberToRemove ? (
        <Modal isOpen={true} onClose={() => !isRemoving && setMemberToRemove(null)} title="Remove member">
          <div className="space-y-4 pt-4 sm:pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                  <Shield size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-[var(--arena-text)]">Remove member</h2>
                  <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
                    Remove <strong>{memberToRemove.name}</strong> from <strong>{clubName}</strong>. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => setMemberToRemove(null)} disabled={isRemoving}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleRemoveMember} disabled={isRemoving}>
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
