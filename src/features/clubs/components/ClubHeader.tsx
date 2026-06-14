import { useNavigate } from 'react-router-dom'
import { MapPin, Users, UserPlus, Settings } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useClub, useClubMembers, useMyMembership } from '../hooks/useClubQueries'
import { useRequestJoinClub } from '../../hooks/useMutations'
import { BANNER_PRESETS, THEME_MAP } from '../constants'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'

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

  if (clubLoading || !club) {
    return <div className="h-40 sm:h-52 animate-pulse bg-slate-800 rounded-2xl" />
  }

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const isMember = myMembership?.status === 'active' || user?.role === 'superadmin'
  const canJoin = user && !isMember && club.open_join !== false

  const accent = club.accent_color || 'emerald'
  const theme = THEME_MAP[accent] || THEME_MAP.emerald
  const primaryButtonClass = accent !== 'emerald' 
    ? `${theme.bg} ${theme.bgHover} text-white shadow-none`
    : ''

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

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm border border-[var(--arena-border)] bg-[var(--arena-surface)]">
      {/* Banner Image / Gradient */}
      <div 
        className={`w-full relative transition-all duration-300 ${
          isMember ? 'h-24 sm:h-28' : 'h-32 sm:h-40'
        } ${
          club.banner_url 
            ? 'bg-cover bg-center' 
            : BANNER_PRESETS.find(p => p.id === club.banner_preset)?.gradient || 'bg-gradient-to-r from-emerald-600 to-emerald-800'
        }`}
        style={club.banner_url ? { backgroundImage: `url(${club.banner_url})` } : undefined}
      >
        <div className="absolute inset-0 bg-black/10" />

        {/* Absolute Settings Button on Banner for Admins */}
        {isAdmin ? (
          <Button
            variant="secondary"
            onClick={() => navigate(`/club/${clubId}/settings`)}
            className="absolute top-3 right-3 h-8 w-8 p-0 rounded-full bg-slate-900/60 hover:bg-slate-800/80 text-white backdrop-blur-sm border border-white/10 shadow-sm transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings size={15} aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {/* Header content overlay / details */}
      <div className="relative px-4 pb-4 pt-0 sm:px-6">
        {/* Adaptive Layout: Member vs Public Stranger */}
        {isMember ? (
          /* Compact Active Member View */
          <div className="flex items-center justify-between -mt-7 sm:-mt-8 mb-1 gap-3 flex-wrap pt-0 pb-1">
            <div className="flex items-center gap-3 min-w-0">
              {/* Floating Logo (Small) */}
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full ring-2 ring-[var(--arena-surface)] bg-slate-100 flex items-center justify-center overflow-hidden shadow-md shrink-0">
                {club.logo_url ? (
                  <img 
                    src={club.logo_url} 
                    alt={`${club.name} logo`} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`h-full w-full flex items-center justify-center text-xl sm:text-2xl font-black text-white ${theme.bg}`}>
                    {club.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Title & Metadata inline */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black leading-tight text-[var(--arena-text)] truncate">{club.name}</h1>
                  <span className="text-[10px] text-[var(--arena-text-dim)]">•</span>
                  <span className="text-xs font-semibold text-[var(--arena-text-muted)]">{memberCount} members</span>
                  {myMembership?.status === 'active' ? (
                    <Badge className={`${theme.bgLight} ${theme.textDark} border-${accent}-200 capitalize font-bold text-[9px] px-1.5 py-0`}>
                      {myMembership.role}
                    </Badge>
                  ) : null}
                  {isAdmin ? (
                    <Badge className="border-blue-200 bg-blue-50 text-blue-800 font-bold text-[9px] px-1.5 py-0">
                      Admin
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--arena-text-dim)] mt-0.5">
                  <span>Club Workspace</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Landing Mode for Strangers / Public Display */
          <div className="flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-10 sm:-mt-12 mb-4 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
                {/* Floating Logo (Standard) */}
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full ring-4 ring-[var(--arena-surface)] bg-slate-100 flex items-center justify-center overflow-hidden shadow-md shrink-0">
                  {club.logo_url ? (
                    <img 
                      src={club.logo_url} 
                      alt={`${club.name} logo`} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center text-2xl sm:text-3xl font-black text-white ${theme.bg}`}>
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
              </div>
            </div>

            <hr className="border-[var(--arena-border)] my-4 opacity-50" />

            {/* Quick Stats Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--arena-text-muted)]">
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
          </div>
        )}
      </div>
    </div>
  )
}
