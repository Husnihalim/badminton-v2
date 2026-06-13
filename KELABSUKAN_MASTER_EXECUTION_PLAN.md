# KelabSukan Master Execution Plan

## Purpose

This is the **single execution reference** for all KelabSukan implementation work.

It consolidates product direction, visual design tokens, critical context, execution rules, and the 7-week phased checklist into one actionable file.

Existing reference docs (TRUE_NORTH, UIUX_REQUIREMENTS, EXECUTION_FRAMEWORK, AI_OPERATING_MODEL, PHASE_1_SPEC, PHASE_CONTROL) remain available for depth, but this file is the primary operating document.

Status labels: `- [ ]` = not started, `- [/]` = in progress, `- [x]` = done.

---

## 1. Product True North (Condensed)

### Mission
Turn amateur sports activity into stories, drama, rivalries, rankings, stats, player profiles, club history, media moments, and talent visibility.

### Core Belief
Clubs, admins, and members stay free. Revenue comes from sponsors, advertisers, venues, and brands around the attention layer.

### Product Loop
Before session → hype → session happens → scores/media uploaded → stories generated → recap published → stats updated → next-session tension created → shared back into WhatsApp.

### 5 Pillars
| Pillar | Description |
|---|---|
| Members | Free profiles, stats, rankings, match history, stories, recognition. Sports identity, not admin. |
| Clubs | Free pages, sessions, scores, club history, member activity, media coverage. Own newsroom feel. |
| Stories | The product. Stats are the proof. Match reports, session reviews, rivalry updates, spotlights, weekly recaps. |
| Audience | Public opt-in content: club pages, player profiles, match reports, rankings, rising players, sports feed. |
| Commercial | Sponsors pay for attention. Community stays free. |

### WhatsApp Principle
WhatsApp is the discussion layer. KelabSukan is the structured proof, story, stats, and memory layer. Always support WhatsApp invite links, shareable scorecards/cards/recaps, and public proof links. Do not try to replace WhatsApp chat.

### Guardrails
- Public showcase is opt-in. Private club data stays private.
- Stories based on verified sports activity. No private-life gossip, no personal insults, no body/appearance jokes, no sensitive speculation.
- Drama is allowed when sport-based, playful, and backed by data.

### Decision Filter
Before building: Does this build habit? Create/improve stories? Grow audience? Protect trust? Support free community? Help future revenue? Make athletes more visible?

---

## 2. Visual Design System (Token Reference)

### Arena Colors (Dark Mode — Always-On)
```
Background:          #040d0f  (--arena-bg override)
Surface:             #0a0f0e  (--arena-surface / BG_CARD from mockups)
Surface Elevated:    #111827  (--arena-surface-elevated)
Electric Lime:       #ccff00  (--arena-lime, --arena-accent)
Sky Blue:            #38bdf8  (--arena-blue)
Text Primary:        #f8fafc  (--arena-text)
Text Muted:          #94a3b8  (--arena-text-muted / SLATE_400)
Text Dim:            #64748b  (--arena-text-dim / SLATE_500)
Border Light:        rgba(255,255,255,0.15)  (--arena-line)
Border Blue:         rgba(56,189,248,0.2)    (--arena-line-blue)
Panel Glass:         rgba(255,255,255,0.04)  (--arena-panel)
Admin Panel:         rgba(255,255,255,0.03)  (--arena-admin)
Muted Text:          rgba(255,255,255,0.4)   (--arena-muted)
Accent Soft:         rgba(204,255,0,0.1)     (--arena-accent-soft)
Glow:                0 0 20px rgba(204,255,0,0.08)  (--arena-glow)
```

### Component Styles
| Component | Style |
|---|---|
| Panels (arena-panel) | `bg-[var(--arena-panel)] border border-[var(--arena-line)] rounded-xl backdrop-blur-sm shadow-[var(--arena-glow)]` |
| Blue Panels (arena-panel-blue) | Same but `border-[var(--arena-line-blue)]` with blue-tinted gradient |
| Admin Panels (arena-admin-panel) | `bg-[var(--arena-admin)] border border-[rgba(148,163,184,0.2)] rounded-xl` |
| Buttons — Primary | `bg-[var(--arena-lime)] text-[#040d0f] font-bold rounded-lg` |
| Buttons — Live | `border border-[var(--arena-lime)] bg-[var(--arena-lime)] text-slate-950` |
| Buttons — Ghost | Transparent, `text-[var(--arena-text-muted)]`, hover fills |
| Badges — Live | `border-[rgba(204,255,0,0.42)] bg-[rgba(204,255,0,0.12)] text-[var(--arena-lime)]` |
| Badges — Blue | `border-[rgba(56,189,248,0.38)] bg-[rgba(56,189,248,0.1)] text-[var(--arena-blue)]` |
| Badges — Default | `border border-border bg-surface-muted text-text-muted` (use CSS vars) |
| Scoreboard Tiles | Large bold numbers, lime for winner, white for loser |
| Player Card | Avatar + name + club + sport + rank + win rate + form + best partner + nemesis |
| Player Identity Card (BWF) | Large avatar with rank badge (#1-999), name, club + city, W-L record, win rate %, form arrow (up/down) |
| Story Card | Headline + proof stat + club/date context + player avatars + share CTA |
| Friendly Scoreboard (BWF) | Match header: 2 player avatars side-by-side with club flags + H2H badge. Series progress bar. List of matchup rows (completed/live/pending). Each matchup shows pair avatars, names, winner score in lime, loser score dim. Decision badge on decider games. Game-by-game scores (G1, G2, G3) expandable below the match. |
| Matchup Row | 3-column: left (pair A avatar + name), center (score + win/loss label), right (pair B name + avatar). Winner side gets lime accent. Live matchups get pulsing green border. |
| Series History Bar | Visual bar split (60/40, 80/20, etc.) showing all-time friendly record between two clubs. Label: "LEP BC 3 - 2 Smashers PJ" |
| Public Proof Page | Branded KelabSukan header + compact BWF scoreboard + full matchup list with game scores + featured player identity cards + "Join KelabSukan" CTA + OG meta tags for WhatsApp preview |

### Typography
```
Font Family:  Inter (primary), SF Mono (mono)
Headlines:    font-headline, bold, tracking-tight
Body:         font-sans, text-[var(--arena-text)]
Labels:       text-[10px-12px] uppercase tracking-wider text-[var(--arena-text-dim)]
Scores:       arena-score-number (large bold mono numbers)
```

### Layout
- Mobile-first: 390px viewport baseline
- Desktop: 1440px max
- Content max-width: 1180px (existing `main` rule)
- Bottom padding for mobile nav: 88px

---

## 3. Critical Context

### 7 Missing CSS Variables
The following variables are **referenced in components but not defined** in `src/index.css`. This is the #1 cause of the "dull UI" — the design system is wired to nothing.

| Variable | Used In | Fix |
|---|---|---|
| `--arena-lime` | 40+ refs in components, App.css, badge.tsx, button.tsx | Add to `:root.dark` as `#ccff00` |
| `--arena-blue` | badge.tsx, App.css, sports.tsx | Add as `#38bdf8` |
| `--arena-line` | App.css (panel borders), card.tsx, sports.tsx | Add as `rgba(255,255,255,0.15)` |
| `--arena-line-blue` | App.css | Add as `rgba(56,189,248,0.2)` |
| `--arena-panel` | App.css (panel backgrounds) | Add as `rgba(255,255,255,0.04)` |
| `--arena-admin` | App.css | Add as `rgba(255,255,255,0.03)` |
| `--arena-muted` | App.css (muted text/stat values) | Add as `rgba(255,255,255,0.4)` |

### Friendly System Duplication
- `src/lib/friendlyApi.ts` (449 lines) — duplicates core API functions. 2 lint errors at lines 429 and 446 (`as any` type assertions).
- `src/lib/friendlyStoryMoments.ts` (421 lines) — duplicates story engine from `src/lib/storyMoments.ts` (333 lines).
- Must consolidate into core modules and delete both files.

### Monolith State
- `src/lib/api.ts` — 2,149 lines, single file. Must split into domain modules.
- `src/pages/SuperAdminAnalyticsPage.tsx` — 1,017 lines.
- `src/components/ScoreRecordingModal.tsx` — 999 lines.

### Existing But Unused RPC
- Migration: `supabase/migrations/20260611000000_player_dashboard_rpc.sql` (361 lines)
- Creates `get_player_dashboard(p_user_id UUID)` but `DashboardPage.tsx:60-61` still calls `useClubsMatches(clubIds)` and `useClubsMembers(clubIds)` — fan-out not eliminated.

### 48 Hardcoded `bg-[#0b1322]` Instances
Spread across 12 files. Must be replaced with CSS variable references (`bg-black`, `bg-[var(--arena-surface)]`, or removed).

### Undefined Landing Page Classes
`LandingPage.tsx` uses classes `landing-hero`, `landing-hero-copy`, `landing-hero-title`, `landing-hero-text`, `racket-hero-collage`, `racket-hero-image`, etc. — none are defined in any CSS file.

---

## 4. Execution Rules

### Build Sequence
```
spec → preview → review → real route → checks → preview deploy → approval → production
```

### Mandatory Gates
- `npm run lint` — must be **0 errors**
- `npm run test` — must pass
- `npm run build` — must pass
- Mobile (390px) and desktop (1440px) viewport check
- No horizontal overflow, no console errors
- Preview deploy required before any production UI change

### Scope Rules
- Do not redesign multiple major routes in one pass
- Do not build landing page before core internal language is stable
- Do not deploy production without preview approval
- Do not mix unrelated UI changes into one commit
- Do not create one-off styles when a reusable component exists
- Do not let admin UX dominate member UX
- Do not expose private player or club content publicly
- Do not generate stories without proof

### Definition of Done
- Purpose written, target user clear, screen type identified
- Design follows approved visual direction (dark arena, lime accents, glassy panels)
- Mobile + desktop layout checked, no overflow, contrast readable
- Admin actions not primary on member screens
- Share action where story/share value exists
- Lint, tests, build pass
- Preview deploy reviewed before production

---

## 5. The 7-Week Execution Checklist

---

### Week 0 — Design System Repair (COMPLETED)

**Goal:** Fix the 7 broken CSS variables so the design system actually renders. Rebuild glassmorphic panel classes. Fix button/badge variants. Replace hardcoded colors.

**Source of truth:** `src/index.css`, `src/App.css`, `mockups/friendly/generate_mockups.py`

**Files affected:** `src/index.css`, `src/App.css`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/pages/LandingPage.tsx`

- [x] **0.1** Add 7 missing `--arena-*` CSS variables in `src/index.css` under `:root` selectors.
- [x] **0.2** Override `--arena-bg` in dark mode from `#0b0f19` to `#040d0f` (true arena dark background).
- [x] **0.3** Override `--arena-surface` in dark mode from `#111827` to `#0a0f0e` (mockup card color).
- [x] **0.4** Remove or disable light mode `:root` block — enforce always-dark arena base.
- [x] **0.5** Rebuild `.arena-panel` in `src/App.css` — reference `var(--arena-panel)`, `var(--arena-line)`, add `backdrop-filter: blur(8px)`, proper shadow.
- [x] **0.6** Rebuild `.arena-panel-blue` — reference `var(--arena-line-blue)`, blue-tinted gradient overlay.
- [x] **0.7** Rebuild `.arena-admin-panel` — reference `var(--arena-admin)`, dimmer border, no glow.
- [x] **0.8** Define `.landing-hero` and `.racket-hero-collage` classes in `src/App.css` (needed by `LandingPage.tsx`).
- [x] **0.9** Fix `src/components/ui/button.tsx` — ensure primary variant uses `var(--arena-lime)` and bold font weight.
- [x] **0.10** Fix `src/components/ui/badge.tsx` — replace hardcoded colors with `var(--arena-lime)`, `var(--arena-blue)`, and theme variables for all variants.
- [x] **0.11** Replace 48 `bg-[#0b1322]` occurrences across 12 files with `bg-black` or `bg-[var(--arena-surface)]` (verified clean of hardcoded dark greys).
- [x] **0.12** Map `--arena-lime` and `--arena-blue` into `@theme` block in `src/index.css` so Tailwind classes work.

**Verify:**
- [x] `npm run lint` — 0 errors (ESlint passing)
- [x] `npm run test` — pass (41/41 unit tests passing)
- [x] `npm run build` — pass (Compiles successfully with CSS/JS bundles)

---

### Week 1 — Competitions Database & API Foundations

**Goal:** Eliminate the duplicated friendly tables and construct a unified `competitions` database schema and API layer capable of supporting both inter-club friendlies and individual tournaments.

**Files affected:** `src/lib/friendlyApi.ts` (delete), `src/lib/friendlyStoryMoments.ts` (delete), `src/lib/storyMoments.ts` (merge into), `src/lib/api/competitions.ts` (new), `supabase/migrations/` (migrations)

- [ ] **1.1** Audit friendlyApi functions and write migration to create unified tables: `competitions`, `competition_pools`, `competition_participants`, `competition_matchups` (respecting RLS & Realtime).
- [ ] **1.2** Port friendly matchups logic to match the new unified table structure.
- [ ] **1.3** Merge `friendlyStoryMoments.ts` unique story types into `storyMoments.ts` (ensuring no story format is lost).
- [ ] **1.4** Build the **Competitions API** (`src/lib/api/competitions.ts`):
  - `createCompetition()`: Create friendly or tournament draft.
  - `registerParticipant()`: Roster players/pairs.
  - `generatePoolMatches()`: Setup pool groups and schedule matchups.
- [ ] **1.5** Clean up and update all callers of friendlyApi to import from the new unified module.
- [ ] **1.6** Delete `friendlyApi.ts` and `friendlyStoryMoments.ts`.

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] Database migrations execute successfully against local/remote DB

---

### Week 2 — BWF Competitions UI (Scoreboard & Pools)

**Goal:** Rebuild the competition matches layout in BWF broadcast style. Group matchups inside pools, implement collapsible pool headers, standings cards, and a dual-level tab bar navigation hierarchy.

**Design reference:** `mockups/friendly/friendly_scoreboard_mockup.html`

**Files affected:** `src/pages/CompetitionDetailsPage.tsx` (new), `src/components/competition/CompetitionScoreboard.tsx` (new), `src/components/PlayerIdentityCard.tsx` (new)

- [ ] **2.1** Build `PlayerIdentityCard.tsx` as a reusable component (circular avatar with rank badge overlay, location, record, win rate %, form arrow).
- [ ] **2.2** Rebuild the event details page to support the dual-level navigation hierarchy:
  - Level 1: *Details*, *Roster*, *Matches*, *Standings*, *Playoffs*.
  - Level 2 (Matches): *Format*, *List*, *Standings*.
  - Level 3: *All*, *Pending*, *Completed*.
- [ ] **2.3** Render **BWF Matchup cards**: court number, scheduled time, player cards side-by-side, scoresets with winner highlighted in electric lime.
- [ ] **2.4** Implement collapsible **Pool dropdowns** to filter matches by pool.
- [ ] **2.5** Implement the **Standings view**: real-time calculation of points, matches, and set records.
- [ ] **2.6** Build `PublicCompetitionPage.tsx` for shared WhatsApp previews showing branding and scoreboard stats (non-auth viewable).

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] Mobile (390px) and desktop (1440px) viewport checks pass

---

### Week 3 — Visual Playoffs & Bracket Trees

**Goal:** Build the single-elimination playoff bracket tree. Generate connected bracket nodes and display progression paths visually.

**Files affected:** `src/components/competition/PlayoffBracket.tsx` (new), `src/lib/api/competitions.ts`

- [ ] **3.1** Build the playoff bracket generator API: auto-qualify top players/pairs from pools and seed them into elimination bracket slots.
- [ ] **3.2** Design the SVG/CSS **Playoff Bracket Tree** component: responsive nodes displaying pair names, scores, and lines connecting winners to the next round.
- [ ] **3.3** Add glowing connector lines: highlights path green/blue when matches are completed or live.
- [ ] **3.4** Integrate the Playoff bracket view into the "Playoffs" tab of the unified Competitions page.

**Verify:**
- [ ] Bracket tree renders correctly on mobile without overflow
- [ ] Winning a match updates the bracket node in real-time

---

### Week 4 — Leaderboards, RPC, & Monolith Breakup

**Goal:** Optimize performance by wiring the dashboard RPC, introducing rank delta indicators, and breaking the 2,149-line `api.ts` monolith into domain-specific modules.

**Files affected:** `src/lib/api.ts` (delete/split), `src/pages/DashboardPage.tsx`, `src/pages/ClubLeaderboardPage.tsx`, `src/components/RankDelta.tsx` (new)

- [ ] **4.1** Split `src/lib/api.ts` into domain files under `src/lib/api/` (`clubs.ts`, `matches.ts`, `events.ts`, `profiles.ts`, `notifications.ts`, `index.ts`).
- [ ] **4.2** Split `SuperAdminAnalyticsPage.tsx` (1,017 lines) and `ScoreRecordingModal.tsx` (999 lines) into structured modules/hooks.
- [ ] **4.3** Wire the `get_player_dashboard` RPC in `DashboardPage.tsx` to eliminate redundant per-club member and match fetches.
- [ ] **4.4** Build `RankDelta.tsx` (up/down rank delta arrow indicator) and integrate delta data into the club leaderboard page.

**Verify:**
- [ ] Linter passes with 0 errors
- [ ] Verify database fetch count is reduced on dashboard page load

---

### Week 5 — Push Notifications & Stripe Payments

**Goal:** Implement Web Push notifications for rankings, match results, and session reminders. Set up Stripe Connect MVP for session and tournament payment collection.

**Files affected:** `supabase/migrations/` (notifications & payments), `src/hooks/usePushNotifications.ts` (new), `src/lib/api/payments.ts` (new)

- [ ] **5.1** Create `push_subscriptions` migration, register service worker, and prompt permissions on dashboard entry.
- [ ] **5.2** Wire triggers to send push alerts for: rank changes, match results recorded, and session start reminders.
- [ ] **5.3** Create Stripe Connect backend integration: allow club owners to connect their Stripe accounts to collect fees.
- [ ] **5.4** Allow players to pay for sessions/competitions directly in-app, taking a 2-3% transaction fee on checkout.

---

### Week 6 — Geolocation Social Discovery

**Goal:** Add geolocation proximity search so players can discover nearby badminton, tennis, and pickleball clubs/sessions.

**Files affected:** `src/pages/DiscoverPage.tsx` (new), `src/lib/api/discovery.ts` (new), `supabase/migrations/` (postgis indexes)

- [ ] **6.1** Enable PostGIS on Supabase and index club locations by coordinates.
- [ ] **6.2** Build search API filtering sessions and clubs by: distance, date, sport, and skill level.
- [ ] **6.3** Design the `/discover` view: Map integration or list cards showing active courts, play times, and spot availability.

---

### Week 7 — Polish & Launch

**Goal:** BWF design system audit, viewport checks, end-to-end user testing, Netlify deployment, production launch.

- [ ] **7.1** Full audit to ensure dark theme background (`#040d0f`) and glassmorphic panels render without glitches.
- [ ] **7.2** Viewport checking on mobile (390px) and desktop (1440px) on all routes.
- [ ] **7.3** End-to-end testing: create club -> register tournament -> run pool matchups -> progress to brackets -> record scores -> share public result to WhatsApp.
- [ ] **7.4** Deploy preview builds to Netlify, run owner approval checks, and deploy to production.

---

## Appendix: Quick Reference

### Commands
```bash
npm run lint        # Must be 0 errors
npm run test        # Must pass
npm run build       # Must pass
npm run dev         # Local dev server
```

### Design Rule Summary
1. Always-dark arena (`#040d0f`). No light mode.
2. Lime (`#ccff00`) for primary actions and status.
3. Sky blue (`#38bdf8`) for secondary live/status accents.
4. Glassmorphism panels with thin borders (1px, `var(--arena-line)`).
5. Mobile-first (390px), desktop check (1440px).
6. Player card is the atomic media asset.
7. Every shareable moment needs a public proof link.
8. Admin UX must not dominate member UX.
9. **BWF-style scoreboard**: Player identity cards (avatar + rank badge + W-L + win rate + form) are the hero of every matchup. Never show just text names. Game-by-game scores (G1, G2, G3 format) must be expandable below each completed matchup. Winner highlighted in lime, loser dimmed. Series history bar between clubs must be prominent.

