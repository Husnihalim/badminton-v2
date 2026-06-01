import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, RefreshCw, Save, Settings, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buildInviteUrl, getClub, getMyMembership, regenerateInviteCode, updateClub } from '../lib/api'
import type { Club, Membership } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Page, PageHeader } from '../components/ui/page'
import { Textarea } from '../components/ui/textarea'

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [openJoin, setOpenJoin] = useState(true)
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [inviteCode, setInviteCode] = useState('')

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
      setInviteCode(clubData.invite_code || '')
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
      
      setSuccessMessage('Club settings saved.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'))
    } finally {
      setIsSaving(false)
    }
  }

  const inviteUrl = inviteCode ? buildInviteUrl(inviteCode) : ''

  const handleRegenerateCode = async () => {
    if (!clubId) return
    
    try {
      const newCode = await regenerateInviteCode(clubId)
      setInviteCode(newCode || '')
      setSuccessMessage('New invite link generated.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate new code'))
    }
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('Invite link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin' || user?.role === 'superadmin'

  if (isLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
      </Card>
    )
  }

  if (error || !club) return <Navigate to="/not-found" replace />
  if (!isAdmin) return <Navigate to={`/club/${clubId}`} replace />

  return (
    <Page>
      {successMessage ? <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg sm:left-auto sm:w-80">{successMessage}</div> : null}

      <PageHeader
        eyebrow="Club admin"
        title="Club settings"
        description={`Manage ${club.name} details, approval rules, and invite link.`}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/club/${clubId}`)}>
            <ArrowLeft size={17} aria-hidden="true" />
            Back
          </Button>
        }
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Settings size={18} aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold text-slate-950">Basic information</h2>
              </div>

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Club name *</span>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Description</span>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is your club about?" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Location</span>
                  <Input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Community Center Court" />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>City</span>
                  <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kuala Lumpur" />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardContent className="space-y-4 pt-4 sm:pt-5">
                <h2 className="text-lg font-bold text-slate-950">Join settings</h2>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                  <input className="mt-1 h-4 w-4 accent-emerald-700" type="checkbox" checked={openJoin} onChange={(e) => setOpenJoin(e.target.checked)} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Allow new members to join</span>
                    <span className="text-sm text-slate-600">Strangers can request to join, then admins approve.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                  <input className="mt-1 h-4 w-4 accent-emerald-700" type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} disabled={!openJoin} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Require approval for strangers</span>
                    <span className="text-sm text-slate-600">Invite links still let friends join directly.</span>
                  </span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-950">Invite link</h2>
                  <Badge>Instant join</Badge>
                </div>
                <Input value={inviteUrl} readOnly className="font-mono text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={handleCopyCode} disabled={!inviteUrl}>
                    <Copy size={17} aria-hidden="true" />
                    Copy link
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleRegenerateCode}>
                    <RefreshCw size={17} aria-hidden="true" />
                    New
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate(`/club/${clubId}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save size={17} aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>

      {membership?.role === 'owner' ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3 pt-4 sm:pt-5">
            <div className="flex items-center gap-3 text-red-700">
              <ShieldAlert size={18} aria-hidden="true" />
              <h2 className="text-lg font-bold">Danger zone</h2>
            </div>
            <p className="text-sm text-red-800">These actions are irreversible. Keep this area limited to ownership changes.</p>
            <Button variant="danger" type="button" onClick={() => alert('Transfer ownership feature coming soon')}>
              Transfer ownership
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </Page>
  )
}
