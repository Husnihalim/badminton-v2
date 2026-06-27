# Proposal: Community Tournament Features

Based on deep research of Minton AI's tournament platform.

---

## Part 1: How Minton AI Structures Tournaments

Minton AI uses a **two-axis format system** that determines how the entire
competition behaves — from match generation to standings display.

### Axis 1: Skill Level (Category)

| Label | Meaning |
|-------|---------|
| **B** — Bakat Baru | New Talent / Intermediate |
| **C** — Social | Casual / Recreational |
| **D** — Social No Podium | Ultra casual, no medal |

Shown as badges on every tournament card.

### Axis 2: Match Format (How matches are arranged)

| Format | What it does | Display |
|--------|-------------|---------|
| **League Match** | Round-robin: every player/pair plays everyone in their group | Standings table, ranked by wins |
| **Death Match** | Single-elimination knockout: lose and you're out | Bracket tree visualization |

Shown as `{Level} - {Skill} / {Format}` e.g. `C - Social / League Match`.

### Axis 3: Event Type

Men's Singles, Men's Doubles, Women's Doubles, Mixed Doubles, 3v3.

### Example tournament card from their /home page:

```
SPARING NIGHT AT SG2 SUPERSPORT VOL 1
2026-06-19 - 2026-06-20
GUDANG 2 LOT 3467, JALAN SUNGAI DUA...
C - Social / League Match
Men's Doubles
24/24 [████████████████] Full
Upcoming
```

### What this means for match generation:

- **League Match** → round-robin algorithm: pair each participant against every
  other, group into rounds, standings determine winner
- **Death Match** → single-elimination bracket: seed participants, create
  bracket_round/bracket_position matchups, winners advance to next round

---

## Part 2: KelabSukan Current State vs Minton AI

| Area | Minton AI | KelabSukan |
|------|-----------|------------|
| Format choices | Skill level + Match format + Event type | Friendly (2 clubs) / League (3+ clubs) |
| Registration | Self-serve with quota | Admin-invite only |
| Skill tiers | B/C/D visible on cards | None |
| Capacity | `24/24` bars on every card | Not shown |
| Knockout | Death Match = auto bracket | `PlayoffBracket.tsx` exists but **disabled** |
| Public view | Live updates | Static page |
| League match | Round-robin, standings table | Round-robin, standings table ✅ |
| Match generation | Auto by format | Manual "Generate Matchups" button |

---

## Part 3: Proposed Format System for KelabSukan

Currently KelabSukan has `friendly` and `league` (both club-vs-club). I propose
adding a **third format**: `tournament` for individual/pair community events.

A tournament organizer would configure:

```
Tournament:
  ├── Format:  Round Robin ("League Match")  → standings table
  │        or  Knockout  ("Death Match")      → bracket tree
  │        or  Group Stage + Knockout         → pools → bracket
  ├── Level:   B (Bakat Baru) / C (Social) / D (Casual)
  ├── Type:    MD / WD / XD / MS / 3v3
  ├── Capacity: max players/pairs
  └── Mode:    Open registration / Admin invite
```

The format choice determines:

1. **Which tab appears** on the competition detail page
   - Round Robin → "Standings" tab with league table
   - Knockout → "Playoffs" tab with bracket tree
   - Group + Knockout → "Groups" tab + "Playoffs" tab

2. **How matchups are generated**
   - Round Robin: N×(N-1)/2 pairings, ordered by round
   - Knockout: seeded bracket with bracket_round/bracket_position
   - Group + Knockout: pools first, then bracket

3. **How the winner is determined**
   - Round Robin: most wins (with tiebreakers)
   - Knockout: final match winner
   - Group + Knockout: bracket champion

### What already exists in the codebase:

| Piece | Status |
|-------|--------|
| `competition_pools` table | ✅ Schema exists, unused |
| `bracket_round` / `bracket_position` columns | ✅ On matchups table |
| `PlayoffBracket.tsx` component | ✅ 352 lines, SVG connectors, seeding form |
| `roster_mode: 'open'` field | ✅ Defined, unused |
| `subscribeToCompetitionMatchups()` | ✅ API function exists |
| Round-robin `generateMatchups()` | ✅ Works for clubs |
| Standings computation | ✅ In CompetitionDetailsPage |

### What needs to be built:

| # | Item | Effort |
|---|------|--------|
| 1 | Add `tournament` format, `max_participants`, `skill_level` to DB + types | 0.5h |
| 2 | `generatePlayoffBracket()` API — creates bracket matchups | 1h |
| 3 | `generateNextBracketRound()` API — pairs winners for next round | 1h |
| 4 | Wire PlayoffBracket component to real API (remove "not available" stub) | 0.5h |
| 5 | Self-serve registration API + UI button | 2h |
| 6 | Capacity bar on tournament cards | 1h |
| 7 | Realtime subscriptions on public scoreboard | 1h |
| 8 | Tournament creation wizard in CreateCompetitionModal | 2h |
| 9 | Skill level badge on cards + filter | 1h |

**Total: ~10h**

---

## Part 4: How UI/UX Changes by Tournament Format

This is the most important design question. The format choice at creation time
determines what the user sees:

### Round Robin ("League Match")

```
Tabs: Overview | Rosters | Matchups | Standings | Live
                                             └── League table
                                                 Rank | Player | Pld | W | L | Rubbers
```

- Matchups tab shows all pairings grouped by round
- Standings tab shows ranked table
- Winner = player with best record

### Knockout ("Death Match")

```
Tabs: Overview | Rosters | Playoffs | Live
                           └── Bracket tree (SVG)
                               Round 1 → Semis → Finals
```

- Playoffs tab shows PlayoffBracket component
- Winner = last player standing

### Group Stage + Knockout ("Pools → Playoffs")

```
Tabs: Overview | Rosters | Groups | Playoffs | Live
                           └── Pool tables    └── Bracket tree
                               Group A  Rank 1→
                               Group B  Rank 2→
```

This is the **most common** for Malaysian community badminton — guarantees
everyone multiple matches before elimination.

---

## Part 5: Recommended Roadmap

```
Week 1 (Foundation, ~4h):
  ─ Add tournament format + capacity + skill level to DB/types
  ─ Build bracket-generation APIs
  ─ Wire PlayoffBracket (remove stub)
  ─ Real-time on public scoreboard

Week 2 (Core UX, ~4h):
  ─ Self-serve registration
  ─ Capacity bars on cards
  ─ Tournament creation wizard

Week 3 (Polish, ~2h):
  ─ Skill level badges and filters
  ─ Tournament tab on competition list
```

Each week is self-contained. Want me to walk through how a specific format
would look step by step?
