import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardPenLine, ShieldCheck, Smartphone, Trophy, Users } from 'lucide-react'
import ClubCard from '../components/ClubCard'
import { getClubs } from '../lib/api'
import type { Club } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page } from '../components/ui/page'
import heroBadminton from '../assets/hero-badminton.webp'
import heroPickleball from '../assets/hero-pickleball.webp'
import heroTennis from '../assets/hero-tennis.webp'

export default function LandingPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadClubs = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getClubs()
      // Show first 4 clubs on landing page
      setClubs(data.slice(0, 4))
    } catch (err) {
      console.error('Error loading clubs:', err)
      // Fallback to empty array - error is silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClubs()
  }, [loadClubs])

  return (
    <Page>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="space-y-3">
            <h1 className="landing-hero-title">
              Run racket clubs, sessions, scores, and members in one place.
            </h1>
            <p className="landing-hero-text">
              Create clubs, schedule game days, record singles or doubles results, and keep members aligned without messy spreadsheets.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Link to="/register">
              <Button fullWidth className="sm:w-auto">
                <Users size={17} aria-hidden="true" />
                Get started
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" fullWidth className="sm:w-auto">
                Log in
              </Button>
            </Link>
          </div>
        </div>
        <div className="racket-hero-collage" aria-label="Racket sports club action">
          <img className="racket-hero-image racket-hero-image-main" src={heroBadminton} alt="Badminton player lunging for a shuttle" />
          <img className="racket-hero-image racket-hero-image-side" src={heroTennis} alt="Tennis player hitting a forehand" />
          <img className="racket-hero-image racket-hero-image-small" src={heroPickleball} alt="Pickleball player reaching near the net" />
          <div className="racket-hero-stat racket-hero-stat-top">
            <strong>RSVPs</strong>
            <span>Live session status</span>
          </div>
          <div className="racket-hero-stat racket-hero-stat-bottom">
            <strong>Scores</strong>
            <span>Singles + doubles</span>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <TrustCard icon={<ShieldCheck size={18} />} title="Club-ready" text="Built around admins, members, RSVPs, and approvals." />
        <TrustCard icon={<ClipboardPenLine size={18} />} title="Fast scoring" text="Record casual and competitive match results quickly." />
        <TrustCard icon={<Smartphone size={18} />} title="Phone-first" text="Designed for use beside the court, not just on desktop." />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Featured clubs</h2>
        {isLoading ? (
          <Card>
            <CardContent className="pt-5 text-sm text-slate-600">Loading clubs...</CardContent>
          </Card>
        ) : clubs.length > 0 ? (
          <div className="grid gap-3">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-5 text-center">
              <p className="text-sm text-slate-600">No clubs yet. Be the first to create one.</p>
              <Link to="/register" className="brand-button">Get started</Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">What the app covers</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard icon={<Users size={18} />} title="Club management" text="Track members, approvals, social links, and club activity." />
          <FeatureCard icon={<Trophy size={18} />} title="Score capture" text="Record singles and doubles results with clean score history." />
          <FeatureCard icon={<CalendarDays size={18} />} title="Events" text="Create game days, manage RSVPs, and see attendance quickly." />
          <FeatureCard icon={<ShieldCheck size={18} />} title="Admin controls" text="Keep settings, invite links, and access approvals organized." />
        </div>
      </section>
    </Page>
  )
}

function TrustCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-4 sm:pt-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{icon}</span>
        <h3 className="font-bold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{text}</p>
      </CardContent>
    </Card>
  )
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card>
      <CardContent className="flex gap-3 pt-4 sm:pt-5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-emerald-700">{icon}</span>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="text-sm leading-6 text-slate-600">{text}</p>
        </div>
      </CardContent>
    </Card>
  )
}
