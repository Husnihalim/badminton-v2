import { CalendarDays, Plus, Radio, Settings, Users } from 'lucide-react'
import {
  ClubHeadlineCard,
  LiveStatusChip,
  PlayerIdentityCard,
  ScoreboardTile,
  SectionHeader,
  ShareCardPreview,
  StoryCard,
} from '../components/sports'
import { AdminPanel, ApprovalRow, DangerZonePanel, InviteLinkCard, SettingRow } from '../components/admin/AdminPrimitives'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page, PageHeader } from '../components/ui/page'

export default function UiPreviewPage() {
  return (
    <Page className="arena-preview p-4 sm:p-6">
      <PageHeader
        tone="arena"
        eyebrow="UI/UX Phase 1"
        title="Design System Foundation"
        description="Preview lab for the KelabSukan Live Sports Network visual system. This route uses mock data only and does not replace real product routes."
        actions={
          <>
            <Button type="button" variant="live">
              <Plus size={16} aria-hidden="true" />
              Primary live action
            </Button>
            <Button type="button" variant="panel">
              <Settings size={16} aria-hidden="true" />
              Panel action
            </Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <ScoreboardTile label="Going" value="18" helper="Friday night" tone="blue" />
        <ScoreboardTile label="Checked in" value="14" helper="Arena Shah Alam" tone="lime" />
        <ScoreboardTile label="Matches" value="42" helper="This week" />
        <ScoreboardTile label="Rivalries" value="3" helper="Active stories" tone="heat" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <ClubHeadlineCard
          club="Lepak Badminton Club"
          headline="Friday Night Doubles"
          meta="Arena Badminton Shah Alam. Live session preview with club headlines, leaderboards, and story hooks."
          stats={[
            { label: 'Players', value: '28' },
            { label: 'Matches', value: '42' },
            { label: 'Stories', value: '5' },
          ]}
        />

        <PlayerIdentityCard
          name="Husni Halim"
          sport="Badminton"
          clubName="Lepak Badminton Club"
          city="Shah Alam"
          bio="Aggressive net player with sharp smashes, tight games, and a rivalry record that keeps the group chat awake."
          socialHandles={['@husnihalim', '@kelabsukan']}
          metrics={[
            { label: 'Record', value: '35W-17L' },
            { label: 'Win rate', value: '68%' },
            { label: 'Form', value: 'W W L W' },
            { label: 'Rank', value: '#4 / 28' },
          ]}
          details={[
            { label: 'Latest headline', value: '22-20 comeback win' },
            { label: 'Best partner', value: 'Faiz Zulkifli' },
            { label: 'Top rival', value: 'Amir Izwan' },
            { label: 'Gear', value: 'Astrox 88D / BG66' },
          ]}
          gear={{
            racket: 'Yonex Astrox 88D Pro',
            racket_weight: '4U',
            racket_balance: 'head_heavy',
            racket_stiffness: 'stiff',
            strings: 'BG66 Ultimax',
            tension: '27 lbs',
            grip_type: 'overgrip',
            shoes: 'Yonex Power Cushion 65Z3',
            play_style: 'aggressive',
            dominant_hand: 'right',
            player_type: 'doubles',
          }}
          rankings={[
            { clubId: 'lepak-bc', clubName: 'Lepak BC', rank: 4, total: 28 },
            { clubId: 'kl-smashers', clubName: 'KL Smashers', rank: 12, total: 64 },
          ]}
          toughestOpponent={{
            name: 'Amir Izwan',
            userId: 'mock-amir-id',
            avatarUrl: null,
            wins: 2,
            losses: 4,
            matches: 6,
            winRate: 33,
          }}
          mostDefeatedOpponent={{
            name: 'Danial Hakim',
            userId: 'mock-danial-id',
            avatarUrl: null,
            wins: 5,
            losses: 1,
            matches: 6,
            winRate: 83,
          }}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <StoryCard
          category="Rivalry watch"
          title="Amir still leads"
          body="Husni says he is not keeping count. The app, unfortunately for him, is."
          proof="4-2 H2H"
          actionLabel="Share story"
        />
        <StoryCard
          category="Comeback"
          title="Down 12-19, won 22-20"
          body="The score says friendly. The group chat says otherwise."
          proof="Game 3"
          tone="blue"
        />
        <StoryCard
          category="Weekly champion"
          title="Afiq owns Friday"
          body="Six wins from seven matches is usually how the group chat problem starts."
          proof="6W-1L"
          tone="heat"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card variant="live">
          <CardContent className="space-y-4 p-4">
            <SectionHeader eyebrow="Game day live" title="Friday Night Doubles" action={<LiveStatusChip label="Live" />} />
            <div className="grid gap-2 sm:grid-cols-3">
              <ScoreboardTile label="Court 1" value="21-19" helper="Husni / Faiz" tone="lime" />
              <ScoreboardTile label="Court 2" value="Up next" helper="Wani / Mira" tone="blue" />
              <ScoreboardTile label="MVP" value="Afiq" helper="6 wins" tone="heat" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="live">
                <Radio size={12} aria-hidden="true" />
                Courts live 2/4
              </Badge>
              <Badge variant="blue">
                <CalendarDays size={12} aria-hidden="true" />
                9:00 PM
              </Badge>
              <Badge variant="muted">
                <Users size={12} aria-hidden="true" />
                18 going
              </Badge>
            </div>
          </CardContent>
        </Card>

        <ShareCardPreview
          title="Husni / Faiz def Amir / Danial"
          subtitle="Court 1. Game 1. Proof-backed scorecard ready for WhatsApp."
          score="21-19"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Admin command center" description="Calm, dense admin surfaces that still belong to the sports-network system.">
          <div className="grid gap-2">
            <ApprovalRow name="Rizal Hakim" requestedAt="Requested 2h ago" />
            <ApprovalRow name="Nur Syawani" requestedAt="Requested 6h ago" />
            <InviteLinkCard code="kelabsukan.app/lepakbc" activeLinks={3} />
          </div>
        </AdminPanel>

        <AdminPanel title="Club settings sample" description="Settings rows and destructive actions are visually separated.">
          <div className="grid gap-2">
            <SettingRow label="Join mode" value="Manual approval" />
            <SettingRow label="Public stories" value="Admin review" />
            <SettingRow label="Invite links" value="3 active" />
            <DangerZonePanel />
          </div>
        </AdminPanel>
      </section>
    </Page>
  )
}
