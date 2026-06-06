import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera, Flame, MessageCircle, Radio, Trophy, Users } from 'lucide-react'
import { getClubs } from '../lib/api'
import type { Club } from '../types'
import { Page } from '../components/ui/page'
import clubPulseHero from '../assets/landing-club-pulse-hero.jpg'
import clubNightImage from '../assets/landing-club-night.jpg'
import matchActionImage from '../assets/landing-match-action.jpg'
import championMomentImage from '../assets/landing-champion-moment.jpg'

type ShowcaseClub = {
  name: string
  city: string
  pulse: string
  metric: string
  image: string
}

type StoryCard = {
  label: string
  title: string
  club: string
  detail: string
  image: string
}

const fallbackClubs: ShowcaseClub[] = [
  {
    name: 'Lepak Badminton Club',
    city: 'Shah Alam',
    pulse: 'Friday Night Doubles is live',
    metric: '18 going',
    image: clubNightImage,
  },
  {
    name: 'PJ Racquet Crew',
    city: 'Petaling Jaya',
    pulse: 'New rivalry story published',
    metric: '4-2 H2H',
    image: matchActionImage,
  },
  {
    name: 'KL Sunday Smash',
    city: 'Kuala Lumpur',
    pulse: 'Weekly champion crowned',
    metric: '6 wins',
    image: championMomentImage,
  },
]

const stories: StoryCard[] = [
  {
    label: 'Comeback Story',
    title: 'Down 12-19, won 22-20',
    club: 'Lepak BC',
    detail: 'A late-session comeback becomes a share-ready story card for the whole group.',
    image: matchActionImage,
  },
  {
    label: 'Rivalry Watch',
    title: 'Amir leads Husni 4-2',
    club: 'PJ Racquet Crew',
    detail: 'The next game already has tension before anyone steps on court.',
    image: clubNightImage,
  },
  {
    label: 'Weekly Champion',
    title: 'Afiq wins 6 from 7',
    club: 'KL Sunday Smash',
    detail: 'Stats become recognition, and recognition gives players a reason to come back.',
    image: championMomentImage,
  },
]

const players = [
  { rank: '#1', name: 'Afiq Rahman', club: 'KL Sunday Smash', winRate: '78%', note: '6W streak' },
  { rank: '#4', name: 'Husni Halim', club: 'Lepak BC', winRate: '74%', note: 'Rivalry heat' },
  { rank: '#7', name: 'Faiz Zulkifli', club: 'PJ Racquet Crew', winRate: '71%', note: 'Best partner' },
]

const activityPhotos = [
  { label: 'Club night', image: clubNightImage, caption: 'Courts, players, friends' },
  { label: 'Match action', image: matchActionImage, caption: 'Live doubles energy' },
  { label: 'Weekly champion', image: championMomentImage, caption: 'Moments worth sharing' },
]

const moments = [
  { value: '42', label: 'matches became stories' },
  { value: '12', label: 'share cards generated' },
  { value: '5', label: 'clubs active tonight' },
]

export default function LandingPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClubName, setSelectedClubName] = useState(fallbackClubs[0].name)

  const loadClubs = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getClubs()
      setClubs(data.slice(0, 3))
    } catch (err) {
      console.error('Error loading clubs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClubs()
  }, [loadClubs])

  const showcaseClubs = useMemo(() => {
    if (clubs.length === 0) {
      return fallbackClubs
    }

    return fallbackClubs.map((fallback, index) => {
      const club = clubs[index]
      if (!club || club.name.trim().length < 4) {
        return fallback
      }

      return {
        ...fallback,
        name: club.name,
        city: club.city || fallback.city,
        pulse: fallback.pulse,
        metric: `${club.membersCount || 0} members`,
      }
    })
  }, [clubs])

  const activeClub = showcaseClubs.find((club) => club.name === selectedClubName) || showcaseClubs[0]

  useEffect(() => {
    if (!showcaseClubs.some((club) => club.name === selectedClubName)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClubName(showcaseClubs[0].name)
    }
  }, [selectedClubName, showcaseClubs])

  return (
    <Page className="-mx-4 -mt-5 overflow-hidden bg-[#030809] px-4 pb-8 pt-4 text-white sm:-mx-6 sm:px-6 md:-mt-7">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex items-center justify-between border-b border-lime-300/20 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ccff00]">Live Sports Network</p>
            <div className="text-3xl font-black italic tracking-tight sm:text-4xl">
              Kelab<span className="text-[#ccff00]">Sukan</span>
            </div>
          </div>
          <Link
            to="/register"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#ccff00] px-3 py-2 text-xs font-black uppercase text-black shadow-[0_0_24px_rgba(204,255,0,0.35)] transition hover:bg-white"
          >
            Join
          </Link>
        </header>

        <section className="relative min-h-[620px] overflow-hidden rounded-lg border border-white/10 bg-black md:min-h-[650px]">
          <img src={clubPulseHero} alt="Badminton doubles club action" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,9,0.38),rgba(3,8,9,0.78)_46%,#030809_100%)]" />
          <div className="relative flex min-h-[620px] flex-col justify-between p-4 sm:p-5 md:min-h-[650px]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ccff00]/40 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00] backdrop-blur">
                <Radio size={13} aria-hidden="true" />
                Public club pulse
              </div>
              <div className="max-w-xl space-y-3 pt-8 md:pt-16">
                <h1 className="text-[3.35rem] font-black uppercase italic leading-[0.84] tracking-tight sm:text-6xl md:text-7xl">
                  See what clubs are playing tonight.
                </h1>
                <p className="max-w-[36rem] text-sm leading-6 text-slate-200 sm:text-base">
                  KelabSukan shows active clubs, live sessions, player cards, rivalries, weekly rankings, and stories worth sharing.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_0.95fr] md:items-end">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activityPhotos.map((photo) => (
                  <div key={photo.label} className="min-w-[138px] overflow-hidden rounded-lg border border-white/15 bg-black/50">
                    <img src={photo.image} alt={photo.caption} className="h-24 w-full object-cover" />
                    <div className="p-2">
                      <p className="text-[10px] font-black uppercase text-[#ccff00]">{photo.label}</p>
                      <p className="text-[10px] text-slate-300">{photo.caption}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-[#ccff00]/45 bg-[#061011]/90 p-3 backdrop-blur">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ccff00]">Happening now</p>
                    <span className="rounded bg-red-500 px-2 py-1 text-[10px] font-black">LIVE</span>
                  </div>
                  <h3 className="text-xl font-black uppercase italic">{activeClub.pulse}</h3>
                  <p className="text-xs text-slate-300">{activeClub.name} · {activeClub.city}</p>
                  <div className="mt-3 flex items-center justify-between rounded border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span className="text-xs uppercase text-slate-400">Club signal</span>
                    <span className="text-2xl font-black text-[#ccff00]">{activeClub.metric}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/register"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ccff00] px-4 py-3 text-center text-xs font-black uppercase text-black transition hover:bg-white"
                  >
                    Put your club here
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-300/50 bg-cyan-300/10 px-4 py-3 text-center text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    Explore clubs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {moments.map((moment) => (
            <div key={moment.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-3xl font-black text-white">{moment.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{moment.label}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Registered clubs</p>
              <h2 className="text-2xl font-black uppercase italic">Live club channels</h2>
            </div>
            {isLoading ? <span className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-slate-400">Loading</span> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {showcaseClubs.map((club) => (
              <button
                key={club.name}
                type="button"
                onClick={() => setSelectedClubName(club.name)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  activeClub.name === club.name ? 'border-[#ccff00] bg-[#ccff00]/10' : 'border-white/10 bg-white/[0.035] hover:border-cyan-300/40'
                }`}
              >
                <div className="grid grid-cols-[96px_1fr] gap-3 md:block md:space-y-3">
                  <img src={club.image} alt={`${club.name} activity`} className="h-24 w-24 rounded-md object-cover md:h-36 md:w-full" />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black uppercase italic leading-tight">{club.name}</h3>
                        <p className="text-xs text-slate-400">{club.city}</p>
                      </div>
                      <span className="shrink-0 rounded bg-black/55 px-2 py-1 text-xs font-black text-[#ccff00]">{club.metric}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{club.pulse}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ccff00]">Why clubs join</p>
              <h2 className="mt-1 text-2xl font-black uppercase italic sm:text-3xl">The platform looks alive before they even sign up.</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Camera, text: 'Club photos become proof' },
                { icon: Flame, text: 'Rivalries become talking points' },
                { icon: Trophy, text: 'Wins become recognition' },
                { icon: MessageCircle, text: 'Stories go back to WhatsApp' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="rounded-md border border-white/10 bg-black/45 p-3">
                  <Icon size={18} className="mb-2 text-[#ccff00]" aria-hidden="true" />
                  <p className="text-sm font-bold leading-5 text-slate-100">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Player cards</p>
            <h2 className="text-2xl font-black uppercase italic">Players become visible</h2>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {players.map((player) => (
              <article key={player.name} className="min-w-[250px] snap-start rounded-[22px] border border-[#ccff00]/35 bg-[#061011] p-4 shadow-[0_0_28px_rgba(204,255,0,0.08)]">
                <div className="mb-8 flex items-start justify-between">
                  <div className="rounded-md border border-cyan-300/45 px-2 py-1 text-xs font-black text-cyan-200">{player.rank}</div>
                  <div className="h-14 w-14 rounded-full border border-[#ccff00]/50 bg-[radial-gradient(circle_at_40%_30%,#d9ff55,#0a1718_62%)]" />
                </div>
                <h3 className="text-3xl font-black uppercase italic leading-none">{player.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{player.club}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded border border-white/10 bg-black/45 p-2">
                    <p className="text-[10px] uppercase text-slate-500">Win rate</p>
                    <p className="text-xl font-black">{player.winRate}</p>
                  </div>
                  <div className="rounded border border-white/10 bg-black/45 p-2">
                    <p className="text-[10px] uppercase text-slate-500">Signal</p>
                    <p className="text-sm font-bold text-[#ccff00]">{player.note}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ccff00]">Stories to tell</p>
            <h2 className="text-2xl font-black uppercase italic">Normal sessions become headlines</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {stories.map((story) => (
              <article key={story.title} className="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(204,255,0,0.08),rgba(0,180,255,0.05))]">
                <div className="relative h-40">
                  <img src={story.image} alt={story.title} className="absolute inset-0 h-full w-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,9,0.1),rgba(3,8,9,0.88))]" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ccff00]">{story.label}</p>
                    <h3 className="mt-1 text-2xl font-black uppercase italic leading-tight">{story.title}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Published by</p>
                      <p className="font-bold text-slate-100">{story.club}</p>
                    </div>
                    <span className="rounded border border-[#ccff00]/30 px-2 py-1 text-[10px] text-[#ccff00]">Story card</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{story.detail}</p>
                  <div className="mt-4 flex items-center justify-between rounded-md border border-white/10 bg-black/35 px-3 py-2">
                    <span className="text-xs uppercase text-slate-400">Ready for WhatsApp</span>
                    <span className="text-xs font-black text-cyan-200">Share card</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#ccff00]/45 bg-[#ccff00] p-5 text-black shadow-[0_0_40px_rgba(204,255,0,0.2)] md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">For clubs not registered yet</p>
            <h2 className="mt-2 text-3xl font-black uppercase italic leading-none sm:text-4xl">Your club could be the next channel.</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/75">
              Start free. Record matches. Build player cards. Publish club stories. Give your community something worth following.
            </p>
          </div>
          <Link
            to="/register"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-3 text-sm font-black uppercase text-[#ccff00] md:mt-0 md:w-auto"
          >
            Create your club
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2">
            <Users size={16} className="text-[#ccff00]" aria-hidden="true" />
            Clubs, admins, and members stay free.
          </span>
          <Link to="/login" className="font-bold text-cyan-200 hover:text-cyan-100">
            Already registered? Log in
          </Link>
        </section>
      </section>
    </Page>
  )
}
