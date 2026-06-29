import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, RefreshCw, Save, Settings, ShieldAlert, Image as ImageIcon, Camera, Megaphone, Palette, UserCheck, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buildInviteUrl, createSpecificInviteLink, getClub, getMyMembership, getSpecificInviteLinks, regenerateInviteLink, revokeSpecificInviteLink, updateClub, uploadClubLogo, uploadClubBanner, type SpecificClubInvite, getClubMembers } from '../lib/api/clubs'
import { deleteClub } from '../lib/api/superadmin'
import type { Club, Membership } from '../types'
import DeleteClubModal from '../components/DeleteClubModal'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Page, PageHeader } from '../components/ui/page'
import { Textarea } from '../components/ui/textarea'
import { getErrorMessage } from '../lib/utils'

const ACCENT_COLORS = [
  { name: 'emerald', class: 'bg-[var(--arena-accent)] border-emerald-400 text-[var(--arena-accent)]', label: 'Emerald' },
  { name: 'indigo', class: 'bg-indigo-600 border-indigo-400 text-indigo-600', label: 'Indigo' },
  { name: 'violet', class: 'bg-violet-600 border-violet-400 text-violet-600', label: 'Violet' },
  { name: 'amber', class: 'bg-amber-600 border-amber-400 text-amber-600', label: 'Amber' },
  { name: 'rose', class: 'bg-rose-600 border-rose-400 text-rose-600', label: 'Rose' },
  { name: 'sky', class: 'bg-sky-600 border-sky-400 text-sky-600', label: 'Sky' },
]

const BANNER_PRESETS = [
  { id: 'court_green', name: 'Court Green', gradient: 'bg-gradient-to-r from-emerald-600 to-emerald-800' },
  { id: 'court_blue', name: 'Court Blue', gradient: 'bg-gradient-to-r from-sky-600 to-indigo-800' },
  { id: 'dark_elite', name: 'Dark Elite', gradient: 'bg-gradient-to-r from-slate-800 to-slate-950' },
  { id: 'neon_arena', name: 'Neon Arena', gradient: 'bg-gradient-to-r from-fuchsia-700 to-violet-900' },
]

export default function ClubSettingsPage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [club, setClub] = useState<Club | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')


  const [openJoin, setOpenJoin] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [inviteToken, setInviteToken] = useState('')
  const [specificInviteUrl, setSpecificInviteUrl] = useState('')
  const [specificInvites, setSpecificInvites] = useState<SpecificClubInvite[]>([])
  const [inviteStatusTime, setInviteStatusTime] = useState(0)

  // Custom branding states
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerPreset, setBannerPreset] = useState('')
  const [accentColor, setAccentColor] = useState('emerald')
  const [announcement, setAnnouncement] = useState('')
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  const loadClubData = useCallback(async () => {
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
      setName(clubData.name)
      setDescription(clubData.description || '')
      setLocation(clubData.location || '')
      setCity(clubData.city || '')
      setOpenJoin(clubData.open_join !== false)
      setApprovalRequired(clubData.approval_required || false)
      setInviteToken(clubData.invite_code || '')
      
      // Load custom branding fields
      setLogoUrl(clubData.logo_url || '')
      setBannerUrl(clubData.banner_url || '')
      setBannerPreset(clubData.banner_preset || 'court_green')
      setAccentColor(clubData.accent_color || 'emerald')
      setAnnouncement(clubData.announcement || '')
      setInviteStatusTime(Date.now())
      if (user && (
        membershipData?.role === 'owner' ||
        membershipData?.role === 'admin' ||
        user.role === 'superadmin'
      )) {
        const inviteRows = await getSpecificInviteLinks(clubId)
        setSpecificInvites(inviteRows)
      } else {
        setSpecificInvites([])
      }
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !clubId) return

    try {
      setIsUploadingLogo(true)
      setError('')
      const url = await uploadClubLogo(clubId, file)
      setLogoUrl(url)
      setSuccessMessage('Logo uploaded successfully.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload logo'))
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !clubId) return

    try {
      setIsUploadingBanner(true)
      setError('')
      const url = await uploadClubBanner(clubId, file)
      setBannerUrl(url)
      setBannerPreset('') // clear preset when custom cover uploaded
      setSuccessMessage('Banner uploaded successfully.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload banner'))
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return

    try {
      setIsSaving(true)
      setError('')
      
      const announcementChanged = announcement !== (club?.announcement || '')
      
      await updateClub(clubId, {
        name,
        description: description || undefined,
        location: location || undefined,
        city: city || undefined,
        open_join: openJoin,
        approval_required: approvalRequired,
        logo_url: logoUrl || null,
        banner_url: bannerPreset ? null : (bannerUrl || null),
        banner_preset: bannerPreset || null,
        accent_color: accentColor,
        announcement: announcement || null,
        announcement_updated_at: announcementChanged ? new Date().toISOString() : (club?.announcement_updated_at || null),
      })
      
      setSuccessMessage('Club settings saved.')
      setTimeout(() => setSuccessMessage(''), 3000)
      loadClubData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'))
    } finally {
      setIsSaving(false)
    }
  }

  // Club can be deleted by an owner or superadmin only when they are the last member.
  const handleDeleteConfirm = async () => {
    if (!clubId) return;
    setError('');
    setSuccessMessage('');
    // Verify only the deleter remains in the club.
    try {
      const members = await getClubMembers(clubId);
      if (members.length > 1) {
        setError(`Cannot delete club: it still has ${members.length - 1} other member${members.length - 1 === 1 ? '' : 's'}. Please remove them first.`);
        return;
      }
    } catch (err) {
      console.error(err);
      setError('Failed to verify club members before deletion.');
      return;
    }

    if (membership?.role !== 'owner' && user?.role !== 'superadmin') {
      setError('Only club owners or superadmins can delete a club.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClub(clubId);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to delete club. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  const inviteUrl = inviteToken ? buildInviteUrl(inviteToken) : ''

  const handleRegenerateInviteLink = async () => {
    if (!clubId) return
    
    try {
      const newToken = await regenerateInviteLink(clubId)
      setInviteToken(newToken || '')
      setSuccessMessage('New general request link generated.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate new invite link'))
    }
  }

  const handleCopyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('General request link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleCreateSpecificInviteLink = async () => {
    if (!clubId) return

    try {
      const token = await createSpecificInviteLink(clubId)
      if (!token) throw new Error('No specific invite code returned')
      const url = buildInviteUrl(token)
      setSpecificInviteUrl(url)
      await loadClubData()
      await navigator.clipboard.writeText(url)
      setSuccessMessage('Specific auto-approve invite copied.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create specific invite link'))
    }
  }

  const handleCopySpecificInviteLink = async (token: string) => {
    await navigator.clipboard.writeText(buildInviteUrl(token))
    setSuccessMessage('Specific invite copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleRevokeSpecificInviteLink = async (inviteId: string) => {
    try {
      await revokeSpecificInviteLink(inviteId)
      await loadClubData()
      setSuccessMessage('Specific invite revoked.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to revoke specific invite link'))
    }
  }

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin' || user?.role === 'superadmin'

  if (isLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading...</CardContent>
      </Card>
    )
  }

  if (!club) return <Navigate to="/not-found" replace />
  if (!isAdmin) return <Navigate to={`/club/${clubId}`} replace />

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}

      <PageHeader
        eyebrow="Club admin"
        title="Club settings"
        description={`Manage ${club.name} details, custom themes, noticeboard and invite link.`}
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate(`/club/${clubId}`)}
            className="h-10 w-10 p-0 sm:w-auto sm:px-4 sm:py-2"
            title="Back to club home"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        }
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-400">{error}</p> : null}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {/* Basic Info Card */}
            <Card>
              <CardContent className="space-y-4 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
                    <Settings size={18} aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-bold text-[var(--arena-text)]">Basic information</h2>
                </div>

                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>Club name *</span>
                  <Input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                </label>

                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>Description</span>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="What is your club about?" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Location</span>
                    <Input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="e.g. Community Center Court" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>City</span>
                    <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} placeholder="e.g. Kuala Lumpur" />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Club Branding & Theme Card */}
            <Card>
              <CardContent className="space-y-5 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
                    <Palette size={18} aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-bold text-[var(--arena-text)]">Club Branding & Theme</h2>
                </div>

                {/* Logo Section */}
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--arena-text-muted)] block">Club Logo</span>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 rounded-full border border-slate-600 bg-[var(--arena-surface)] flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Club logo preview" className="h-full w-full object-cover" />
                      ) : (
                        <Camera size={24} className="text-[var(--arena-text-muted)]" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="logo-upload-input"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                      <p className="text-[11px] text-[var(--arena-text-muted)] mt-1">Recommended: Square format image, max 5MB.</p>
                    </div>
                  </div>
                </div>

                {/* Accent Color Section */}
                <div className="space-y-2.5">
                  <span className="text-sm font-semibold text-[var(--arena-text-muted)] block">Brand Accent Theme</span>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((c) => {
                      const isSelected = accentColor === c.name
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setAccentColor(c.name)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow'
                              : 'bg-[var(--arena-surface)] border-slate-600 text-[var(--arena-text-dim)] hover:bg-slate-700'
                          }`}
                        >
                          <span className={`h-3.5 w-3.5 rounded-full border ${c.class.split(' ')[0]} ${c.class.split(' ')[1]}`} />
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Preset Banner Covers */}
                <div className="space-y-2.5">
                  <span className="text-sm font-semibold text-[var(--arena-text-muted)] block">Header Banner Cover Preset</span>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                    {BANNER_PRESETS.map((bp) => {
                      const isSelected = bannerPreset === bp.id
                      return (
                        <button
                          key={bp.id}
                          type="button"
                          onClick={() => {
                            setBannerPreset(bp.id)
                            setBannerUrl('')
                          }}
                          className={`flex flex-col text-left rounded-lg overflow-hidden border transition-all ${
                            isSelected 
                              ? 'ring-2 ring-emerald-600 border-transparent shadow' 
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <div className={`h-12 w-full ${bp.gradient}`} />
                          <span className="p-2 text-xs font-semibold text-[var(--arena-text)] truncate block">{bp.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom Banner Cover Upload */}
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--arena-text-muted)] block">Or Upload Custom Cover Banner</span>
                  <div className="space-y-3">
                    {bannerUrl ? (
                      <div className="h-20 w-full rounded-lg border border-slate-600 overflow-hidden bg-[var(--arena-surface)]">
                        <img src={bannerUrl} alt="Custom banner preview" className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div>
                      <input
                        type="file"
                        id="banner-upload-input"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBannerUpload}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById('banner-upload-input')?.click()}
                        disabled={isUploadingBanner}
                        className="gap-1.5"
                      >
                        <ImageIcon size={14} />
                        {isUploadingBanner ? 'Uploading...' : 'Upload Cover Image'}
                      </Button>
                      <p className="text-[11px] text-[var(--arena-text-muted)] mt-1">Recommended: Landscape photo, max 10MB.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            {/* Announcement / Pinned Notice Card */}
            <Card className="border-[var(--arena-accent)] bg-[var(--arena-accent-soft)]/10">
              <CardContent className="space-y-4 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
                    <Megaphone size={18} aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-bold text-[var(--arena-text)]">Pinned Noticeboard Announcement</h2>
                </div>
                <p className="text-xs text-[var(--arena-text-muted)] leading-relaxed">
                  Pin an announcement bar to the absolute top of the club homepage. Perfect for high-priority news (e.g., fees due, court allocations, cancellations).
                </p>

                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>Announcement Message</span>
                  <Textarea 
                    value={announcement} 
                    onChange={(e) => setAnnouncement(e.target.value)} 
                    maxLength={500} 
                    placeholder="Write announcement message (e.g. Fees due this session)..."
                    rows={4}
                  />
                </label>

                {announcement ? (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setAnnouncement('')} 
                    fullWidth
                    className="border-dashed hover:border-slate-350"
                  >
                    Clear Announcement
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {/* Join Settings Card */}
            <Card>
              <CardContent className="space-y-4 pt-4 sm:pt-5">
                <h2 className="text-lg font-bold text-[var(--arena-text)]">Join settings</h2>
                <label className="flex items-start gap-3 rounded-lg border border-slate-600 p-3">
                  <input className="mt-1 h-4 w-4 accent-emerald-700" type="checkbox" checked={openJoin} onChange={(e) => setOpenJoin(e.target.checked)} />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--arena-text-muted)]">Allow new members to join</span>
                    <span className="text-sm text-[var(--arena-text-muted)]">Strangers can request to join, then admins approve.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-600 p-3">
                  <input className="mt-1 h-4 w-4 accent-emerald-700" type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} disabled={!openJoin} />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--arena-text-muted)]">Require approval for strangers</span>
                    <span className="text-sm text-[var(--arena-text-muted)]">General invite links create requests. Specific invites can auto-approve one person.</span>
                  </span>
                </label>
              </CardContent>
            </Card>

            {/* Invite Link Card */}
            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[var(--arena-text)]">General invite link</h2>
                  <Badge>Admin approval</Badge>
                </div>
                <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
                  Share this broadly. Anyone using it will send a join request for admin approval.
                </p>
                <Input value={inviteUrl} readOnly className="font-mono text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={handleCopyInviteLink} disabled={!inviteUrl} className="px-2 text-xs sm:text-sm">
                    <Copy size={16} aria-hidden="true" />
                    Copy link
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleRegenerateInviteLink} className="px-2 text-xs sm:text-sm">
                    <RefreshCw size={16} aria-hidden="true" />
                    Refresh link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[var(--arena-text)]">Specific invite</h2>
                  <Badge className="border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">Auto-approve</Badge>
                </div>
                <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
                  Generate this only for a specific person. It auto-approves one account, then cannot be reused.
                </p>
                {specificInviteUrl ? (
                  <Input value={specificInviteUrl} readOnly className="font-mono text-sm" />
                ) : null}
                <Button type="button" variant="secondary" onClick={handleCreateSpecificInviteLink}>
                  <UserCheck size={17} aria-hidden="true" />
                  Generate and copy specific invite
                </Button>
                {specificInvites.length ? (
                  <div className="space-y-2 border-t border-slate-600 pt-3">
                    <h3 className="text-sm font-bold text-[var(--arena-text)]">Recent specific invites</h3>
                    <div className="space-y-2">
                      {specificInvites.map((invite) => {
                        const isUsed = invite.used_count >= invite.max_uses
                        const isRevoked = Boolean(invite.revoked_at)
                        const isExpired = invite.expires_at ? new Date(invite.expires_at).getTime() < inviteStatusTime : false
                        const isActiveInvite = !isUsed && !isRevoked && !isExpired

                        return (
                          <div key={invite.id} className="grid gap-2 rounded-lg border border-slate-600 bg-[var(--arena-surface)] p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs font-semibold text-[var(--arena-text)]">{buildInviteUrl(invite.token)}</p>
                              <p className="text-xs text-[var(--arena-text-dim)]">
                                {isRevoked ? 'Revoked' : isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'} · Created {new Date(invite.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCopySpecificInviteLink(invite.token)}
                                disabled={!isActiveInvite}
                                className="px-2 text-xs flex items-center justify-center gap-1"
                              >
                                <Copy size={13} aria-hidden="true" />
                                Copy
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRevokeSpecificInviteLink(invite.id)}
                                disabled={!isActiveInvite}
                                className="px-2 text-xs flex items-center justify-center gap-1"
                              >
                                <X size={13} aria-hidden="true" />
                                Revoke
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate(`/club/${clubId}`)} className="flex-1 sm:flex-initial">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="flex-1 sm:flex-initial">
            <Save size={17} aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>

      {membership?.role === 'owner' ? (
        <Card className="border-red-600 bg-red-900/10">
          <CardContent className="space-y-3 pt-4 sm:pt-5">
            <div className="flex items-center gap-3 text-red-700">
              <ShieldAlert size={18} aria-hidden="true" />
              <h2 className="text-lg font-bold">Danger zone</h2>
            </div>
            <p className="text-sm text-red-800">These actions are irreversible. Keep this area limited to ownership changes.</p>
            <Button variant="danger" type="button" onClick={() => alert('Transfer ownership feature coming soon')}>
              Transfer ownership
            </Button>
            <Button variant="danger" type="button" onClick={() => { setError(''); setIsDeleteModalOpen(true); }} className="ml-2">
              Delete club
            </Button>
          </CardContent>
        </Card>
      ) : null}
      
      <DeleteClubModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setError('')
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        clubName={club.name}
        error={error}
      />
    </Page>
  )
}
