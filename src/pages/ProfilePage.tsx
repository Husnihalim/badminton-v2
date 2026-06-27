import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Camera, KeyRound, Lock, MapPin, Plus, Save, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { createClub, getMyClubs, updateProfile, uploadProfilePhoto } from '../lib/api'
import type { Club, PlayerGear, PlayerSocialLinks } from '../types'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Page, PageHeader } from '../components/ui/page'
import { PasswordInput } from '../components/ui/password-input'
import { Select } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { cn } from '../lib/utils'
import { DEFAULT_AVATARS, getDefaultAvatar } from '../lib/defaultAvatars'

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function cleanProfileObject<T extends Record<string, string | null | undefined>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value?.trim() || null])
  ) as T
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateClubModal, setShowCreateClubModal] = useState(false)
  const [clubName, setClubName] = useState('')
  const [clubDescription, setClubDescription] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [preferredSport, setPreferredSport] = useState('badminton')
  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] = useState<PlayerSocialLinks>({})
  const [gear, setGear] = useState<PlayerGear>({})
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const loadMyClubs = useCallback(async () => {
    try {
      setIsLoading(true)
      const myClubs = await getMyClubs()
      setClubs(myClubs)
    } catch (err) {
      console.error('Error loading clubs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }

    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(user.display_name || user.name || '')
      setPhone(user.phone || '')
      setCity(user.city || '')
      setPreferredSport(user.preferred_sport || 'badminton')
      setBio(user.bio || '')
      setSocialLinks(user.social_links || {})
      setGear(user.gear || {})
      setAvatarUrl(user.avatar_url || null)
      setIsPrivate(user.is_private || false)
      loadMyClubs()
      if (searchParams.get('create_club') === 'true') {
        setShowCreateClubModal(true)
      }
    }
  }, [user, authLoading, navigate, loadMyClubs, searchParams])

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
        approval_required: true,
      })
      
      if (newClub) {
        setClubName('')
        setClubDescription('')
        setClubCity('')
        setShowCreateClubModal(false)
        await loadMyClubs()
        navigate(`/club/${newClub.id}`)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create club'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingPhoto(true)
      setProfileError('')
      const publicUrl = await uploadProfilePhoto(user.id, file)
      setAvatarUrl(publicUrl)
      await refreshUser()
      setProfileMessage('Profile photo updated.')
      setTimeout(() => setProfileMessage(''), 3000)
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Failed to upload profile photo'))
    } finally {
      setIsUploadingPhoto(false)
      event.target.value = ''
    }
  }

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    try {
      setIsSavingProfile(true)
      setProfileError('')
      setProfileMessage('')
      await updateProfile(user.id, {
        display_name: displayName.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        preferred_sport: preferredSport || null,
        bio: bio.trim() || null,
        social_links: cleanProfileObject(socialLinks),
        gear: cleanProfileObject(gear),
        is_private: isPrivate,
      })
      await refreshUser()
      setProfileMessage('Profile saved.')
      setTimeout(() => setProfileMessage(''), 3000)
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Failed to save profile'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password || !confirmPassword) {
      setPasswordError('Password and confirmation are required.')
      setPasswordMessage('')
      return
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      setPasswordMessage('')
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      setPasswordMessage('')
      return
    }

    try {
      setIsSavingPassword(true)
      setPasswordError('')
      setPasswordMessage('')

      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setPasswordError(updateError.message)
        return
      }

      setPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password updated successfully.')
      setTimeout(() => setPasswordMessage(''), 3000)
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'Failed to update password'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-[var(--arena-text-muted)]">Loading...</CardContent>
      </Card>
    )
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Profile"
        title="My profile"
        description={user ? `${user.name} • ${user.email}` : undefined}
        actions={
          <Button onClick={() => setShowCreateClubModal(true)}>
            <Plus size={17} aria-hidden="true" />
            Create club
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-5 pt-4 sm:pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b border-[var(--arena-border)] pb-5">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <img
                  src={avatarUrl || (user ? getDefaultAvatar(user.id) : '')}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover bg-slate-900 border border-[var(--arena-border)]"
                />
                <label className="absolute -bottom-2 -right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--arena-border)] bg-white text-[var(--arena-text-muted)] shadow-sm hover:bg-slate-50 transition-colors">
                  <Camera size={14} aria-hidden="true" />
                  <span className="sr-only">Change profile photo</span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleProfilePhotoChange}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
              <div className="min-w-0 space-y-1.5">
                <h2 className="text-lg font-bold text-[var(--arena-text)] leading-tight">{user?.display_name || user?.name}</h2>
                <p className="break-words text-sm text-[var(--arena-text-muted)]">{user?.email}</p>
                {isUploadingPhoto ? <p className="text-xs font-semibold text-[var(--arena-accent)]">Uploading photo...</p> : null}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {user?.role ? <Badge>{user.role}</Badge> : null}
                  <Badge className="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-muted)] text-[10px]">
                    <Lock size={11} aria-hidden="true" />
                    Locked fields
                  </Badge>
                </div>
              </div>
            </div>

            {/* Pick a Cartoon Avatar Selection */}
            <div className="space-y-2 pt-2 sm:pt-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-muted)]">Pick a Cartoon Avatar</h3>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_AVATARS.map((avatar) => {
                  const isSelected = avatarUrl === avatar.url
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={async () => {
                        if (!user) return
                        try {
                          setIsSavingProfile(true)
                          setProfileError('')
                          await updateProfile(user.id, { avatar_url: avatar.url })
                          setAvatarUrl(avatar.url)
                          await refreshUser()
                          setProfileMessage('Profile picture updated to cartoon avatar.')
                          setTimeout(() => setProfileMessage(''), 3000)
                        } catch (err) {
                          setProfileError(getErrorMessage(err, 'Failed to update avatar'))
                        } finally {
                          setIsSavingProfile(false)
                        }
                      }}
                      className={cn(
                        "relative h-9 w-9 rounded-lg border-2 bg-slate-900 overflow-hidden flex items-center justify-center p-0.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer",
                        isSelected
                          ? "border-[var(--arena-accent)] ring-2 ring-[var(--arena-accent-soft)]"
                          : "border-[var(--arena-border)] hover:border-slate-350 dark:hover:border-white/20"
                      )}
                      title={avatar.label}
                    >
                      <img src={avatar.url} alt={avatar.label} className="h-full w-full object-contain" />
                      {isSelected && (
                        <div className="absolute right-0.5 top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--arena-accent)] text-white text-[7px] font-black">
                          ✓
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSaveProfile}>
            {profileError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{profileError}</p> : null}
            {profileMessage ? <p className="rounded-lg border border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] p-3 text-sm text-[var(--arena-accent)]">{profileMessage}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Username</span>
                <Input value={user?.name || ''} disabled />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Email</span>
                <Input value={user?.email || ''} disabled />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Display name</span>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} placeholder="How you want members to see you" />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Phone</span>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="+60..." />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>City</span>
                <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} placeholder="Kuala Lumpur" />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Preferred sport</span>
                <Select value={preferredSport} onChange={(e) => setPreferredSport(e.target.value)}>
                  <option value="badminton">Badminton</option>
                  <option value="tennis">Tennis</option>
                  <option value="squash">Squash</option>
                  <option value="pickleball">Pickleball</option>
                  <option value="table tennis">Table tennis</option>
                  <option value="racquetball">Racquetball</option>
                </Select>
              </label>
            </div>

            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Bio</span>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} placeholder="Short note about your playing level, availability, or club interests." />
            </label>

            <div className="space-y-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3 sm:p-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--arena-text)]">Social handles</h3>
                <p className="text-xs leading-5 text-[var(--arena-text-dim)]">Shown on your player card when your profile is public.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>Instagram</span>
                  <Input value={socialLinks.instagram || ''} onChange={(e) => setSocialLinks((current) => ({ ...current, instagram: e.target.value }))} maxLength={80} placeholder="@playername" />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>TikTok</span>
                  <Input value={socialLinks.tiktok || ''} onChange={(e) => setSocialLinks((current) => ({ ...current, tiktok: e.target.value }))} maxLength={80} placeholder="@playername" />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>Facebook</span>
                  <Input value={socialLinks.facebook || ''} onChange={(e) => setSocialLinks((current) => ({ ...current, facebook: e.target.value }))} maxLength={120} placeholder="Profile name or URL" />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>YouTube</span>
                  <Input value={socialLinks.youtube || ''} onChange={(e) => setSocialLinks((current) => ({ ...current, youtube: e.target.value }))} maxLength={120} placeholder="Channel name or URL" />
                </label>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3 sm:p-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--arena-text)]">Gear &amp; Play Profile</h3>
                <p className="text-xs leading-5 text-[var(--arena-text-dim)]">Shown on your player card. Helps teammates and rivals know your setup.</p>
              </div>

              {/* Racket */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Racket</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Model</span>
                    <Input value={gear.racket || ''} onChange={(e) => setGear((g) => ({ ...g, racket: e.target.value }))} maxLength={120} placeholder="Yonex Astrox 88D Pro" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Weight</span>
                    <Select value={gear.racket_weight || ''} onChange={(e) => setGear((g) => ({ ...g, racket_weight: e.target.value }))}>
                      <option value="">Select weight</option>
                      <option value="2U">2U (90–94g)</option>
                      <option value="3U">3U (85–89g)</option>
                      <option value="4U">4U (80–84g)</option>
                      <option value="5U">5U (75–79g)</option>
                    </Select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Balance</span>
                    <Select value={gear.racket_balance || ''} onChange={(e) => setGear((g) => ({ ...g, racket_balance: e.target.value }))}>
                      <option value="">Select balance</option>
                      <option value="head_heavy">Head Heavy</option>
                      <option value="even_balance">Even Balance</option>
                      <option value="head_light">Head Light</option>
                    </Select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Flex / Stiffness</span>
                    <Select value={gear.racket_stiffness || ''} onChange={(e) => setGear((g) => ({ ...g, racket_stiffness: e.target.value }))}>
                      <option value="">Select flex</option>
                      <option value="stiff">Stiff</option>
                      <option value="medium">Medium</option>
                      <option value="flexible">Flexible</option>
                    </Select>
                  </label>
                </div>
              </div>

              {/* Strings */}
              <div className="space-y-2 border-t border-[var(--arena-border)] pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Strings &amp; Tension</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>String</span>
                    <Input value={gear.strings || ''} onChange={(e) => setGear((g) => ({ ...g, strings: e.target.value }))} maxLength={120} placeholder="BG66 Ultimax" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Tension</span>
                    <Input value={gear.tension || ''} onChange={(e) => setGear((g) => ({ ...g, tension: e.target.value }))} maxLength={40} placeholder="27 lbs" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Grip Type</span>
                    <Select value={gear.grip_type || ''} onChange={(e) => setGear((g) => ({ ...g, grip_type: e.target.value }))}>
                      <option value="">Select grip</option>
                      <option value="overgrip">Overgrip</option>
                      <option value="replacement_grip">Replacement Grip</option>
                      <option value="towel_grip">Towel Grip</option>
                    </Select>
                  </label>
                </div>
              </div>

              {/* Shoes */}
              <div className="space-y-2 border-t border-[var(--arena-border)] pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Court Shoes</p>
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                  <span>Model</span>
                  <Input value={gear.shoes || ''} onChange={(e) => setGear((g) => ({ ...g, shoes: e.target.value }))} maxLength={120} placeholder="Victor A970 Ace" />
                </label>
              </div>

              {/* Play Profile */}
              <div className="space-y-2 border-t border-[var(--arena-border)] pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text-dim)]">Play Profile</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Play Style</span>
                    <Select value={gear.play_style || ''} onChange={(e) => setGear((g) => ({ ...g, play_style: e.target.value }))}>
                      <option value="">Select style</option>
                      <option value="net_player">Net Player (Front Court)</option>
                      <option value="baseline">Baseline (Rear Court)</option>
                      <option value="all_rounder">All-Rounder</option>
                      <option value="aggressive">Aggressive Smasher</option>
                      <option value="defensive">Defensive / Counter</option>
                    </Select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Dominant Hand</span>
                    <Select value={gear.dominant_hand || ''} onChange={(e) => setGear((g) => ({ ...g, dominant_hand: e.target.value }))}>
                      <option value="">Select hand</option>
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                    </Select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                    <span>Player Type</span>
                    <Select value={gear.player_type || ''} onChange={(e) => setGear((g) => ({ ...g, player_type: e.target.value }))}>
                      <option value="">Select type</option>
                      <option value="singles">Singles Specialist</option>
                      <option value="doubles">Doubles Specialist</option>
                      <option value="singles_and_doubles">Singles &amp; Doubles</option>
                    </Select>
                  </label>
                </div>
              </div>
            </div>


            <div className="flex items-center gap-2 py-2">
              <input
                id="is-private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-slate-350 text-[var(--arena-accent)] focus:ring-emerald-700"
              />
              <label htmlFor="is-private" className="text-sm font-semibold text-[var(--arena-text-muted)] select-none">
                Make my profile private (only show basic info to other members)
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingProfile}>
                <Save size={17} aria-hidden="true" />
                {isSavingProfile ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-4 sm:pt-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Change password</h2>
            <p className="text-sm leading-6 text-[var(--arena-text-muted)]">
              Update your password to keep your account secure.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleChangePassword}>
            {passwordError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{passwordError}</p> : null}
            {passwordMessage ? <p className="rounded-lg border border-[var(--arena-accent-soft)] bg-[var(--arena-accent-soft)] p-3 text-sm text-[var(--arena-accent)]">{passwordMessage}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>New password</span>
                <PasswordInput
                  id="profile-new-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a new password"
                  disabled={isSavingPassword}
                />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
                <span>Confirm new password</span>
                <PasswordInput
                  id="profile-confirm-password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                  disabled={isSavingPassword}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingPassword}>
                <KeyRound size={17} aria-hidden="true" />
                {isSavingPassword ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--arena-text)]">My clubs</h2>
          <span className="text-sm font-semibold text-[var(--arena-text-dim)]">{clubs.length}</span>
        </div>

        {clubs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link key={club.id} to={`/club/${club.id}`} className="block">
                <Card className="h-full transition hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="space-y-3 pt-4 sm:pt-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
                        <Building2 size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[var(--arena-text)]">{club.name}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-[var(--arena-text-muted)]">{club.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-[var(--arena-text-dim)]">
                      {club.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} aria-hidden="true" />
                          {club.city}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} aria-hidden="true" />
                        {club.membersCount || 0} members
                      </span>
                    </div>
                    <Badge>{club.role || 'member'}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-5 text-center">
              <p className="text-sm text-[var(--arena-text-muted)]">You have not created or joined any clubs yet.</p>
              <Button onClick={() => setShowCreateClubModal(true)}>
                <Plus size={17} aria-hidden="true" />
                Create one now
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog open={showCreateClubModal} onOpenChange={(open) => !open && setShowCreateClubModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new club</DialogTitle>
            <DialogDescription>Start with the basics. You can adjust settings later.</DialogDescription>
          </DialogHeader>
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <form className="space-y-4" onSubmit={handleCreateClub}>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Club name *</span>
              <Input
                type="text"
                placeholder="e.g. Ace Smash Badminton Club"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Description</span>
              <Input
                type="text"
                placeholder="What is your club about?"
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>City</span>
              <Input
                type="text"
                placeholder="e.g. Kuala Lumpur"
                value={clubCity}
                onChange={(e) => setClubCity(e.target.value)}
                maxLength={120}
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateClubModal(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create club'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
