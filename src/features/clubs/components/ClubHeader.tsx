import { useNavigate } from 'react-router-dom'
import { MapPin, Users, ExternalLink, UserPlus, Settings } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useClub, useClubMembers, useMyMembership } from '../hooks/useClubQueries'
import { useRequestJoinClub, useRegenerateInviteLink } from '../../hooks/useMutations'
import { BANNER_PRESETS, THEME_MAP } from '../constants'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { buildInviteUrl } from '../../../lib/api'

interface ClubHeaderProps {
  clubId: string
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
}

export function ClubHeader({ clubId, setSuccessMessage, setActionError }: ClubHeaderProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: club, isLoading: clubLoading } = useClub(clubId)
  const { data: members } = useClubMembers(clubId)
  const { data: myMembership } = useMyMembership(clubId, !!user)

  const joinMutation = useRequestJoinClub()
  const regenerateMutation = useRegenerateInviteLink()

  if (clubLoading || !club) {
    return <div className="h-40 sm:h-52 animate-pulse bg-slate-800 rounded-2xl" />
  }

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = !!myMembership
  const canJoin = user && !isMember && club.open_join !== false
  const inviteUrl = club.invite_code ? buildInviteUrl(club.invite_code) : ''

  const accent = club.accent_color || 'emerald'
  const theme = THEME_MAP[accent] || THEME_MAP.emerald
  const primaryButtonClass = accent !== 'emerald' 
    ? `${theme.bg} ${theme.bgHover} text-white shadow-none`
    : ''

  const locationQuery = [club.location, club.city].filter(Boolean).join(', ')
  const mapUrl = locationQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}` : ''
  const memberCount = members?.length || club.membersCount || 0

  const handleJoinClub = async () => {
    try {
      await joinMutation.mutateAsync(clubId)
      setSuccessMessage('Join request sent. A club admin will review it.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send join request.')
    }
  }

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('General request link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleGenerateInviteLink = async () => {
    try {
      await regenerateMutation.mutateAsync(clubId)
      setSuccessMessage('General request link generated.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to generate invite link.')
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm border border-[var(--arena-border)] bg-[var(--arena-surface)]">
      {/* Banner Image / Gradient */}
      <div 
        className={`h-40 sm:h-52 w-full relative ${
          club.banner_url 
            ? 'bg-cover bg-center' 
            : BANNER_PRESETS.find(p => p.id === club.banner_preset)?.gradient || 'bg-gradient-to-r from-emerald-600 to-emerald-800'
        }`}
        style={club.banner_url ? { backgroundImage: `url(${club.banner_url})` } : undefined}
      >
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Header content overlay / details */}
      <div className="relative px-4 pb-6 pt-0 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-16 mb-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
            {/* Floating Logo */}
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-md shrink-0">
              {club.logo_url ? (
                <img 
                  src={club.logo_url} 
                  alt={`${club.name} logo`} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`h-full w-full flex items-center justify-center text-3xl sm:text-4xl font-black text-white ${theme.bg}`}>
                  {club.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}>Club Workspace</span>
                {myMembership?.status === 'active' ? (
                  <Badge className={`${theme.bgLight} ${theme.textDark} border-${accent}-200 capitalize font-bold text-[10px]`}>
                    {myMembership.role}
                  </Badge>
                ) : null}
                {isAdmin ? <Badge className="border-blue-200 bg-blue-50 text-blue-800 font-bold text-[10px]">Admin</Badge> : null}
              </div>
              <h1 className="text-xl sm:text-2xl font-black leading-tight text-[var(--arena-text)] mt-1 truncate">{club.name}</h1>
              <p className="mt-1 text-xs sm:text-sm text-[var(--arena-text-muted)] line-clamp-2 max-w-xl">
                {club.description || 'Club workspace for events, members, scores, and activity.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap gap-2 items-center sm:pb-1">
            {canJoin ? (
              <Button onClick={handleJoinClub} className={primaryButtonClass} disabled={joinMutation.isPending}>
                <UserPlus size={17} aria-hidden="true" />
                Request to join
              </Button>
            ) : null}
            {isAdmin ? (
              <Button variant="secondary" onClick={() => navigate(`/club/${clubId}/settings`)} className="hover:bg-[var(--arena-surface-muted)]">
                <Settings size={17} aria-hidden="true" />
                Settings
              </Button>
            ) : null}
          </div>
        </div>

        <hr className="border-slate-100 my-4" />

        {/* Quick Stats Bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-650">
          {club.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={16} className="text-[var(--arena-text-dim)]" aria-hidden="true" />
              {club.location}
            </span>
          ) : null}
          {club.city ? (
            <span className="inline-flex items-center gap-1 text-[var(--arena-text-dim)]">
              ({club.city})
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Users size={16} className="text-[var(--arena-text-dim)]" aria-hidden="true" />
            <strong>{memberCount}</strong> members
          </span>
        </div>

        {locationQuery ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-slate-150 bg-[var(--arena-surface-muted)]/50 p-3 text-sm text-[var(--arena-text-muted)] sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="min-w-0">
              Base location: <strong className="break-words text-[var(--arena-text)]">{locationQuery}</strong>
            </p>
            <a 
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 shadow-sm" 
              href={mapUrl} 
              target="_blank" 
              rel="noreferrer"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Open in Maps
            </a>
          </div>
        ) : null}

        {isAdmin && (
          inviteUrl ? (
            <div className="mt-3 grid gap-2 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/50 p-3 text-sm text-slate-650 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="min-w-0">
                General invite request link: <strong className="break-all font-mono text-[var(--arena-text)]">{inviteUrl}</strong>
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={handleCopyInviteLink}>
                Copy Link
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/50 p-3 text-sm text-slate-650">
              <p className="text-slate-900">No invite link is available yet.</p>
              <p>Generate a general link so new people can request admin approval.</p>
              <Button type="button" size="sm" variant="secondary" onClick={handleGenerateInviteLink} disabled={regenerateMutation.isPending}>
                Generate invite link
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
