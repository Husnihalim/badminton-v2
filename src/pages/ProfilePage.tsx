import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, MapPin, Plus, UserRound, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createClub, getMyClubs } from '../lib/api'
import type { Club } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Page, PageHeader } from '../components/ui/page'

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateClubModal, setShowCreateClubModal] = useState(false)
  const [clubName, setClubName] = useState('')
  const [clubDescription, setClubDescription] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

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
      loadMyClubs()
    }
  }, [user, authLoading, navigate, loadMyClubs])

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
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create club'))
    } finally {
      setIsCreating(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
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
        <CardContent className="flex items-start gap-4 pt-4 sm:pt-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <UserRound size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-2">
            <h2 className="text-lg font-bold text-slate-950">{user?.name}</h2>
            <p className="break-words text-sm text-slate-600">{user?.email}</p>
            {user?.role ? <Badge>{user.role}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">My clubs</h2>
          <span className="text-sm font-semibold text-slate-500">{clubs.length}</span>
        </div>

        {clubs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link key={club.id} to={`/club/${club.id}`} className="block">
                <Card className="h-full transition hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="space-y-3 pt-4 sm:pt-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Building2 size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-950">{club.name}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{club.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
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
              <p className="text-sm text-slate-600">You have not created or joined any clubs yet.</p>
              <Button onClick={() => setShowCreateClubModal(true)}>
                <Plus size={17} aria-hidden="true" />
                Create one now
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {showCreateClubModal && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4" onClick={() => setShowCreateClubModal(false)}>
          <Card className="max-h-[92vh] w-full overflow-auto rounded-b-none sm:max-w-md sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Create new club</h2>
                  <p className="text-sm text-slate-600">Start with the basics. You can adjust settings later.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowCreateClubModal(false)} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </Button>
              </div>
              {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
              <form className="space-y-4" onSubmit={handleCreateClub}>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Club name *</span>
                  <Input
                    type="text"
                    placeholder="e.g. Ace Smash Badminton Club"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>Description</span>
                  <Input
                    type="text"
                    placeholder="What is your club about?"
                    value={clubDescription}
                    onChange={(e) => setClubDescription(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                  <span>City</span>
                  <Input
                    type="text"
                    placeholder="e.g. Kuala Lumpur"
                    value={clubCity}
                    onChange={(e) => setClubCity(e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateClubModal(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create club'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </Page>
  )
}
