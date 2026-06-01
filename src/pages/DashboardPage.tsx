import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardPenLine, Club as ClubIcon, Link2, Trophy, Users } from 'lucide-react'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { getMyClubs, getClubEvents, getClubMatches } from '../lib/api'
import type { Club, ClubEvent, MatchWithDetails } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'

type DashboardClub = Club & { role?: string }
type DashboardEvent = ClubEvent & { clubName?: string }
type DashboardMatch = MatchWithDetails & { clubName?: string }

export default function DashboardPage() {
  const [showScoreModal, setShowScoreModal] = useState(false)
  const { user, isLoading: authLoading } = useAuth()
  const { showToast } = useNotifications()
  const navigate = useNavigate()
  
  const [clubs, setClubs] = useState<DashboardClub[]>([])
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [matches, setMatches] = useState<DashboardMatch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Get user's clubs
      const myClubs = await getMyClubs()
      setClubs(myClubs)
      
      // Get events and matches from all user's clubs
      const allEvents: DashboardEvent[] = []
      const allMatches: DashboardMatch[] = []
      
      for (const club of myClubs) {
        try {
          const [clubEvents, clubMatches] = await Promise.all([
            getClubEvents(club.id),
            getClubMatches(club.id),
          ])
          
          // Add club name to events for display
          allEvents.push(...clubEvents.map(e => ({ ...e, clubName: club.name })))
          allMatches.push(...clubMatches.map(m => ({ ...m, clubName: club.name })))
        } catch (clubErr) {
          console.error(`Error loading data for club ${club.id}:`, clubErr)
        }
      }
      
      // Sort events by date (upcoming first)
      allEvents.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      
      // Sort matches by date (most recent first)
      allMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setEvents(allEvents.slice(0, 5))
      setMatches(allMatches.slice(0, 5))
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (authLoading || !user) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData()
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false)
    }, 5000)
    
    return () => clearTimeout(timeout)
  }, [user, authLoading, loadDashboardData])

  if (authLoading || (user && isLoading)) {
    return (
      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="pt-5 text-center text-sm text-slate-600">Loading...</CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="mx-auto mt-6 max-w-md">
        <CardContent className="space-y-4 pt-5 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Welcome to KelabSukan</h1>
            <p className="text-sm leading-6 text-slate-600">
              Log in to view your dashboard, clubs, events, and match scores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => navigate('/login')}>
              Log in
            </Button>
            <Button variant="secondary" onClick={() => navigate('/register')}>
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate stats
  const totalMatches = matches.length
  const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date()).length
  const clubCount = clubs.length

  return (
    <Page>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Your clubs, sessions, and recent match results in one place."
        actions={
          <Button onClick={() => setShowScoreModal(true)}>
            <ClipboardPenLine size={17} aria-hidden="true" />
            Record score
          </Button>
        }
      />

      <ScoreRecordingModal 
        isOpen={showScoreModal} 
        onClose={() => setShowScoreModal(false)} 
        onScoreRecorded={loadDashboardData}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={<Users size={17} />} label="Clubs" value={clubCount} />
        <StatCard icon={<CalendarDays size={17} />} label="Events" value={upcomingEvents} />
        <StatCard icon={<Trophy size={17} />} label="Matches" value={totalMatches} />
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 pt-4 sm:pt-5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Link2 size={18} aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-950">Have an invite link?</h2>
            <p className="text-sm leading-6 text-slate-600">
              Open the club invite link from your friend. It will add the club directly after you log in.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Your clubs</h2>
        {clubs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link 
                key={club.id} 
                to={`/club/${club.id}`}
                className="block"
              >
                <Card className="h-full transition hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="space-y-3 pt-4 sm:pt-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <ClubIcon size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-950">{club.name}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{club.description}</p>
                      </div>
                    </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                    <span>{club.city}</span>
                    <span>{club.membersCount} members</span>
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
              <p className="text-sm text-slate-600">You have not joined any clubs yet.</p>
              <Link to="/" className="brand-button">
                Find clubs
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Upcoming game days</h2>
        {events.length ? (
          <div className="grid gap-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardContent className="flex items-start gap-3 pt-4 sm:pt-5">
                  <CalendarDays className="mt-1 shrink-0 text-emerald-700" size={18} aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-950">{event.title}</h3>
                    <p className="text-sm text-slate-500">{event.clubName}</p>
                    <p className="text-sm text-slate-700">{new Date(event.event_date).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">{event.location}</p>
                    <Badge className={event.signup_open ? undefined : 'border-red-200 bg-red-50 text-red-700'}>
                      {event.signup_open ? 'Open for signup' : 'Closed'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="empty-state">No upcoming events.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Recent match results</h2>
        {matches.length ? (
          <div className="grid gap-3">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardContent className="flex items-start gap-3 pt-4 sm:pt-5">
                  <Trophy className="mt-1 shrink-0 text-emerald-700" size={18} aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-950">{match.title || `${match.sport} match`}</h3>
                    <p className="text-sm text-slate-500">{match.clubName}</p>
                    <p className="text-sm text-slate-600">{match.sport} • {match.match_type}</p>
                    <p className="font-semibold text-emerald-700">
                      {match.score_sets?.map((s) => `${s.team1_score}-${s.team2_score}`).join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="empty-state">No matches recorded yet.</p>
        )}
      </section>
    </Page>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-slate-500">
          <span className="text-xs font-semibold sm:text-sm">{label}</span>
          <span className="text-emerald-700">{icon}</span>
        </div>
        <p className="text-2xl font-bold leading-none text-slate-950 sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}
