# Integration Proposal: Tournament Format System

## 1. Data Model

### New `competitions` columns

```
competitions:
  format: 'friendly' | 'league' | 'tournament'   ← add 'tournament'
  
  # Only used when format = 'tournament':
  tournament_style: 'round_robin' | 'knockout' | 'pool_playoffs'  ← new
  skill_level: TEXT (B / C / D)                                     ← new  
  max_participants: INTEGER                                         ← new
  event_type: TEXT (md / wd / xd / ms / 3v3)                       ← new
  winner_participant_id: UUID (already exists, unused)
```

### Key architectural decision

`tournament` competitions do **not** use `competition_clubs` at all.
Participants register directly (not through clubs). Matchups link
participants directly. Winner is a participant, not a club.

The existing `friendly`/`league` flows remain untouched.

### `competition_pools` table (currently unused — revived for tournament)

```
competition_pools:
  id, competition_id, name
```

Used only when `tournament_style = 'pool_playoffs'`. Each pool holds a
round-robin group.

### Existing columns already ready

| Column | Where | Purpose | Status |
|--------|-------|---------|--------|
| `pool_id` | `competition_participants` | Which pool a participant is in | ✅ exists |
| `pool_id` | `competition_matchups` | Which pool a matchup belongs to | ✅ exists |
| `bracket_round` | `competition_matchups` | Round in knockout bracket | ✅ exists |
| `bracket_position` | `competition_matchups` | Position in bracket round | ✅ exists |
| `winner_participant_id` | `competitions` | Tournament champion | ✅ exists |

---

## 2. System Flow by Tournament Style

### 2a. Knockout ("Death Match")

```
1. Organizer creates tournament
   └─ format = 'tournament', tournament_style = 'knockout'
   └─ skill_level, event_type, max_participants set

2. Players register (open mode) or admin invites
   └─ participants are direct (no club context)
   └─ shown on Rosters tab with capacity bar

3. Registration closes → admin goes to Playoffs tab
   └─ PlayoffBracket shows seeding form
   └─ admin selects participants for each bracket slot
   └─ clicks "Create Playoff Bracket"

4. generatePlayoffBracket() creates matchups
   └─ bracket_round = 1, bracket_position = 0..N
   └─ matchups appear in bracket tree visualization

5. Score matches (Live tab)
   └─ winner advances automatically

6. Admin clicks "Generate Next Round"
   └─ generateNextBracketRound() pairs winners
   └─ bracket_round increments

7. Final match → winner_participant_id set → competition complete
```

### 2b. Round Robin ("League Match")

```
1. Organizer creates tournament
   └─ format = 'tournament', tournament_style = 'round_robin'
   └─ skill_level, event_type, max_participants set

2. Players register

3. Admin generates matchups
   └─ round-robin algorithm: N × (N-1) / 2 matchups
   └─ stored as regular matchups (no bracket fields)

4. Score matches (Live tab)

5. Standings computed automatically
   └─ Rank | Player | Played | Won | Lost | Rubbers
   └─ Tiebreaker: head-to-head → set difference → point diff

6. Winner = top of standings
```

### 2c. Pool + Playoffs ("Group Stage → Bracket")

```
1. Organizer creates tournament
   └─ format = 'tournament', tournament_style = 'pool_playoffs'

2. Players register

3. Admin creates pools
   └─ e.g. 16 players → 4 pools of 4
   └─ competition_pools rows created
   └─ participants assigned to pools (snake seed)

4. Round-robin within each pool
   └─ generatePoolMatchups() creates intra-pool matchups
   └─ pool standings computed after all pool matches

5. Top N from each pool advance
   └─ admin initiates bracket phase
   └─ generatePlayoffBracket() with advancing participants

6. Knockout bracket (same as 2a)

7. Final winner crowned
```

---

## 3. UI/UX Changes

### Tab Structure (CompetitionDetailsPage)

Current: `Overview | Rosters | Matchups | Live | Results`

Tournament variants:

| Style | Tabs |
|-------|------|
| Knockout | Overview | Rosters | Playoffs | Live | Results |
| Round Robin | Overview | Rosters | Matchups | Standings | Live | Results |
| Pool + Playoffs | Overview | Rosters | Pools | Playoffs | Live | Results |

### Component behavior per format

| Component | friendly/league | tournament: knockout | tournament: round-robin | tournament: pool+playoffs |
|-----------|----------------|---------------------|------------------------|--------------------------|
| Rosters tab | Club lineup selects | Self-register list | Self-register list | Self-register list |
| Matchups tab | Club-vs-club pairs | Hidden | All pairings | Hidden |
| Playoffs tab | Hidden | Bracket tree | Hidden | Bracket tree |
| Standings tab | Club standings (won/lost/tie) | Hidden | Player standings | Pool tables |
| Live tab | BwfMatchupCard | BwfMatchupCard | BwfMatchupCard | BwfMatchupCard |
| Results | Club winner + scores | Bracket + winner | Standings table | Pool + bracket |

### CreateCompetitionModal changes

Add a `tournament` option alongside `friendly` / `league`:

```
Step 1: Competition Type
  ┌─────────────────────────────────────────┐
  │ 🤝 Friendly  (club vs club)             │
  │ 🏆 League    (3+ clubs, round-robin)    │
  │ 🎯 Tournament (individuals/pairs)       │  ← new
  └─────────────────────────────────────────┘

Step 2 (if tournament):
  Format:     ○ Round Robin  ○ Knockout  ○ Pool + Playoffs
  Level:      ○ B (Bakat Baru)  ○ C (Social)  ○ D (Casual)
  Event:      MD / WD / XD / MS / 3v3
  Capacity:   [     ] max players/pairs
  Registration: ○ Open  ○ Admin approval
```

---

## 4. New API Functions

### `competitions.ts` additions

```typescript
// Tournament match generation
generatePlayoffBracket(competitionId, pairings[])
  → creates first-round bracket matchups

generateNextBracketRound(competitionId, currentRound)
  → pairs winners from completed round into next round

generateRoundRobinMatchups(competitionId)
  → creates all N×(N-1)/2 pairings for participants

generatePoolMatchups(competitionId, poolId)
  → creates round-robin within a single pool

selfRegisterParticipant(competitionId, userId, partnerId?)
  → player registers self to an open tournament

// Pool management
createPool(competitionId, name)
  → creates a competition pool

assignParticipantToPool(participantId, poolId)
  → assigns participant to a pool

getPoolStandings(competitionId, poolId)
  → computes standings within a pool

advanceToBracket(competitionId, advancingParticipantIds[])
  → seeds advancing participants into bracket stage
```

### Existing functions that work unchanged

- `recordCompetitionMatch()` — already handles individual matchups
- `getLeagueStandings()` — can be adapted for participant standings
- `subscribeToCompetitionMatchups()` — works for real-time
- `completeCompetition()` — needs update to handle `winner_participant_id`

---

## 5. Files That Change

| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | Add columns, update constraint |
| `types/competition.ts` | Add `tournament_style`, `skill_level`, `max_participants`, `event_type` |
| `lib/api/competitions.ts` | Add 7 new API functions |
| `components/competition/CreateCompetitionModal.tsx` | Add tournament option + steps |
| `pages/CompetitionDetailsPage.tsx` | Dynamic tabs + conditional rendering |
| `pages/PublicCompetitionPage.tsx` | Real-time subscriptions |
| `components/competition/PlayoffBracket.tsx` | Wire to API (remove stub) |
| `pages/FriendliesListPage.tsx` | Show tournament cards + capacity bars |

---

## 6. Migration Plan

### Phase A — Schema + Bracket (4h)
Add columns, wire PlayoffBracket, add bracket APIs. Tournament creation still
uses the existing club flow. Bracket works for any format.

### Phase B — Tournament flow (4h)
Add self-register API, update Rosters tab for open registration, add
round-robin generation for participants, add pool APIs.

### Phase C — Polish (2h)
Update CreateCompetitionModal with tournament wizard, add skill level badges,
capacity bars, filters.

---

## 7. Risk Analysis

| Risk | Mitigation |
|------|-----------|
| Tournament doesn't use clubs, but competition_clubs RLS expects club context | `competition_participants.club_id` can fall back to `competitions.club_id` (the host club) |
| `competition_matchups` has NOT NULL on `participant_a/b_id` — can't create placeholder bracket slots | Generate matchups round by round instead of all upfront |
| Pool revival touches old code | `competition_pools` table is already there, just needs a CREATE IF NOT EXISTS in migration |
| Tournament format choice is irreversible | Add a note in create wizard: "Format cannot be changed after creation" |

---

## Files Modified

- `supabase/migrations/20260629000000_add_tournament_support.sql`
- `src/types/competition.ts`
- `src/lib/api/competitions.ts`
- `src/components/competition/CreateCompetitionModal.tsx`
- `src/components/competition/PlayoffBracket.tsx`
- `src/pages/CompetitionDetailsPage.tsx`
- `src/pages/PublicCompetitionPage.tsx`
- `src/pages/FriendliesListPage.tsx`
