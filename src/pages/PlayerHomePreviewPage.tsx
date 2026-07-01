import { Activity, CalendarDays, Edit3, Search, Share2, Users } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'
import { PlayerIdentityCard } from '../components/sports'

const storyCards = [
  {
    label: 'Comeback',
    title: 'Comeback win',
    text: 'Amir Rahman dropped the opening set, then closed the match with cleaner rallies and a late push.',
    proof: 'Proof: 18-21, 21-17, 21-15',
  },
  {
    label: 'Rivalry',
    title: 'Daniel rematch watch',
    text: 'The record is tightening after their latest club-night result.',
    proof: 'Record: 3-2',
  },
  {
    label: 'Partnership',
    title: 'Best partner: Hafiz',
    text: 'The pair are winning 75% of their doubles matches together.',
    proof: 'Partnership: 6W-2L',
  },
]

const statTiles = [
  ['Singles', '7W-3L', '70% win rate'],
  ['Doubles', '5W-2L', 'Hafiz is top partner'],
  ['Current form', 'W W W L W', '3-match win run'],
  ['Ranking', '#4 / 28', 'KL Smash Club'],
]

export default function PlayerHomePreviewPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Player homepage preview"
        title="Personal homepage"
        description="Mockup route for the player-card homepage direction. This is visible without login for review."
        actions={
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-10 p-0 sm:w-auto sm:px-4 sm:py-2"
            title="Edit profile"
          >
            <Edit3 size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Edit profile</span>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <PlayerIdentityCard
          name="Amir Rahman"
          sport="Badminton"
          clubName="KL Smash Club"
          city="Kuala Lumpur"
          bio="Fast front-court player, prefers attacking doubles, building a stronger singles record this season."
          socialHandles={['@amirplays', '@amirrahman', 'youtube.com/@amirsmash']}
          metrics={[
            { label: 'Record', value: '12W-5L' },
            { label: 'Signature', value: '71% win rate' },
            { label: 'Form', value: 'W W W L W' },
            { label: 'Rank', value: '#4 / 28' },
          ]}
          details={[
            { label: 'Latest headline', value: 'Comeback win' },
            { label: 'Best partner', value: 'Hafiz' },
            { label: 'Top rival', value: 'Daniel' },
            { label: 'Gear', value: 'Astrox 88D / BG66' },
          ]}
          gear={{
            racket: 'Yonex Astrox 88D Pro',
            racket_weight: '3U',
            racket_balance: 'head_heavy',
            racket_stiffness: 'stiff',
            strings: 'BG66 Ultimax',
            tension: '27 lbs',
            grip_type: 'overgrip',
            shoes: 'Victor court shoes',
            play_style: 'net_play',
            dominant_hand: 'right',
            player_type: 'both',
          }}
          rankings={[
            { clubId: 'kl-smash', clubName: 'KL Smash Club', rank: 4, total: 28 },
            { clubId: 'sunday-social', clubName: 'Sunday Social', rank: 2, total: 14 },
          ]}
          toughestOpponent={{
            name: 'Daniel',
            userId: 'mock-daniel-id',
            avatarUrl: null,
            wins: 1,
            losses: 3,
            matches: 4,
            winRate: 25,
          }}
          mostDefeatedOpponent={{
            name: 'Hafiz',
            userId: 'mock-hafiz-id',
            avatarUrl: null,
            wins: 4,
            losses: 1,
            matches: 5,
            winRate: 80,
          }}
        />

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--arena-text)]">Activity summary</h2>
              <p className="text-sm leading-6 text-[var(--arena-text-muted)]">Overview of your club stats.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniCount icon={<Users size={15} />} label="Clubs" value="2" />
              <MiniCount icon={<CalendarDays size={15} />} label="Events" value="3" />
              <MiniCount icon={<Activity size={15} />} label="Matches" value="17" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--arena-text)]">Personal stats</h2>
                <p className="text-sm leading-6 text-[var(--arena-text-muted)]">Singles, doubles, ranking, and current form.</p>
              </div>
              <Badge className="border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">Live from matches</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {statTiles.map(([label, value, note]) => (
                <div key={label} className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--arena-text-dim)]">{label}</p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--arena-text)]">{value}</p>
                  <p className="mt-1 text-xs font-medium text-[var(--arena-text-dim)]">{note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--arena-text)]">My sports story</h2>
                <p className="text-sm leading-6 text-[var(--arena-text-muted)]">Proof-backed story cards from match data.</p>
              </div>
              <Button type="button" size="sm" variant="secondary">
                <Share2 size={14} aria-hidden="true" />
                Share
              </Button>
            </div>
            <div className="grid gap-3">
              {storyCards.map((story) => (
                <div key={story.title} className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Badge className="border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text-muted)]">{story.label}</Badge>
                    <span className="text-xs font-semibold text-[var(--arena-text-dim)]">{story.proof}</span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-[var(--arena-text)]">{story.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--arena-text-muted)]">{story.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Gear and tools</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Yonex Astrox 88D Pro', 'BG66 Ultimax', '27 lbs', 'Victor court shoes'].map((item) => (
                <div key={item} className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--arena-text)]">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Clubs</h2>
            <div className="grid gap-2">
              {['KL Smash Club', 'Sunday Social Badminton'].map((club) => (
                <div key={club} className="flex items-center justify-between rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] px-3 py-2">
                  <span className="font-semibold text-[var(--arena-text)]">{club}</span>
                  <Badge>member</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Find another club</h2>
            <p className="text-sm leading-6 text-[var(--arena-text-muted)]">This area stays below the player homepage, not above it.</p>
          </div>
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--arena-text-dim)]" size={16} aria-hidden="true" />
            <div className="min-h-10 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] py-2 pl-9 pr-3 text-sm font-medium text-[var(--arena-text-dim)]">
              Search by club, city, or sport
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}



function MiniCount({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-3">
      <div className="flex items-center justify-between gap-2 text-[var(--arena-text-dim)]">
        <span className="text-xs font-semibold">{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-extrabold text-[var(--arena-text)]">{value}</p>
    </div>
  )
}
