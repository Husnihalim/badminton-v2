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

### Week 0 — Design System Repair

**Goal:** Fix the 7 broken CSS variables so the design system actually renders. Rebuild glassmorphic panel classes. Fix button/badge variants. Replace hardcoded colors.

**Source of truth:** `src/index.css`, `src/App.css`, `mockups/friendly/generate_mockups.py`

**Files affected:** `src/index.css`, `src/App.css`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/pages/LandingPage.tsx`, 12 files with `bg-[#0b1322]`

- [ ] **0.1** Add 7 missing `--arena-*` CSS variables in `src/index.css` under `:root.dark` (and provide light-theme fallbacks):

```css
/* Add after existing :root.dark block */
--arena-lime: #ccff00;
--arena-blue: #38bdf8;
--arena-line: rgba(255, 255, 255, 0.15);
--arena-line-blue: rgba(56, 189, 248, 0.2);
--arena-panel: rgba(255, 255, 255, 0.04);
--arena-admin: rgba(255, 255, 255, 0.03);
--arena-muted: rgba(255, 255, 255, 0.4);
```

- [ ] **0.2** Override `--arena-bg` in dark mode from `#0b0f19` to `#040d0f` (true arena dark from mockups)
- [ ] **0.3** Override `--arena-surface` in dark mode from `#111827` to `#0a0f0e` (mockup card color)
- [ ] **0.4** Remove or disable light mode `:root` block — enforce always-dark arena base
- [ ] **0.5** Rebuild `.arena-panel` in `src/App.css` — reference `var(--arena-panel)`, `var(--arena-line)`, add `backdrop-blur-sm`, proper shadow
- [ ] **0.6** Rebuild `.arena-panel-blue` — reference `var(--arena-line-blue)`, blue-tinted gradient overlay
- [ ] **0.7** Rebuild `.arena-admin-panel` — reference `var(--arena-admin)`, dimmer border, no glow
- [ ] **0.8** Define `.landing-hero` and `.racket-hero-collage` classes in `src/App.css` (needed by `LandingPage.tsx`)
- [ ] **0.9** Fix `src/components/ui/button.tsx` — ensure primary variant uses `var(--arena-lime)`, danger variant uses `var(--arena-accent)` or define red tokens
- [ ] **0.10** Fix `src/components/ui/badge.tsx` — replace hardcoded colors with `var(--arena-lime)`, `var(--arena-blue)`, etc. for all variants (default, live, blue, heat, danger, muted)
- [ ] **0.11** Replace 48 `bg-[#0b1322]` occurrences across 12 files with `bg-black` or `bg-[var(--arena-surface)]` depending on context
- [ ] **0.12** Map `--arena-lime` and `--arena-blue` into `@theme` block so Tailwind classes like `bg-lime`/`text-lime` work

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] Open app — panels render with glassy borders, lime accents visible, no missing-variable artifacts
- [ ] Check mobile 390px on a panel-heavy page

---

### Week 1 — Friendly System Consolidation + BWF Scoreboard Rebuild

**Goal:** Eliminate the parallel friendly system. Route all friendly operations through core API/story functions. Fix 2 lint errors. Delete duplicated files. Rebuild `FriendlyScoreboard` with BWF-style player identity cards, matchup grid, game-by-game scores, and series history bar.

**Design reference:** `mockups/friendly/friendly_scoreboard_mockup.html` (3 phone screens: Live Scoreboard, Matchmaking Grid, Public Proof Page)

**Files affected:** `src/lib/friendlyApi.ts` (delete), `src/lib/friendlyStoryMoments.ts` (delete), `src/lib/storyMoments.ts` (merge into), `src/lib/api.ts` (core match/club functions), all callers of friendlyApi functions, `src/components/friendly/FriendlyScoreboard.tsx` (rebuild), `src/components/friendly/FriendlyShareCard.tsx` (rebuild), `src/components/PlayerIdentityCard.tsx` (new)

- [ ] **1.1** Audit `friendlyApi.ts` — map all exported functions to equivalent core API functions. Document mapping in a comment or migration guide.
  - Likely mappings: `createFriendlyMatch()` → `createMatch()` RPC, `getFriendlies()` → `getClubMatches()`, etc.
- [ ] **1.2** Audit `friendlyStoryMoments.ts` — merge unique story types into `storyMoments.ts`. Ensure no story type is lost.
- [ ] **1.3** Rewrite `recordFriendlyMatch()` to call core `createMatch()` RPC with appropriate parameters
- [ ] **1.4** Fix 2 lint errors in `friendlyApi.ts:429` and `:446` — replace `as any` with proper Supabase Realtime types, or use `unknown` with type guard
- [ ] **1.5** Update all callers of friendlyApi functions to import from core API modules instead
- [ ] **1.6** Update all callers of friendlyStoryMoments to import from storyMoments instead
- [ ] **1.7** Delete `src/lib/friendlyApi.ts`
- [ ] **1.8** Delete `src/lib/friendlyStoryMoments.ts`
- [ ] **1.9** **Rebuild `FriendlyScoreboard.tsx`** with BWF broadcast layout:
  - [ ] BWF match header: two player cards side-by-side (large avatar, pair name, club name, Malaysia flag icon, H2H record badge)
  - [ ] Series history bar: visual split bar showing all-time record between clubs (e.g., 60/40 bar, label "LEP BC 3 - 2 Smashers PJ")
  - [ ] Player Identity Card component for each player in the friendly (avatar with rank badge, name, club + city, W-L record, win rate %, form arrow)
  - [ ] Matchup rows: 3-column layout (pair A avatar + name | center score + win/loss | pair B name + avatar). Winner score in lime, loser dimmed. Live matchups get pulsing green border.
  - [ ] Game-by-game expandable section below each completed matchup showing G1, G2, G3 scores with winner highlighted. "Decider" badge on third game.
  - [ ] Status badge: LIVE (pulsing green dot), ACCEPTED (blue), MATCHMAKING (lime), COMPLETED (white)
- [ ] **1.10** **Rebuild `FriendlyShareCard.tsx`** to match BWF layout — the canvas-generated share image must show player avatars, scoreboard, matchup results, and club branding
- [ ] **1.11** **Build `PlayerIdentityCard.tsx`** as reusable component:
  - Props: `avatar: string`, `name: string`, `club: string`, `city: string`, `rank: number`, `wins: number`, `losses: number`, `winRate: number`, `form: number` (positive/negative delta)
  - Renders: large circular avatar with rank badge overlay, name, club + city line, stat row (W-L, win rate %, form arrow)
  - BWF style: lime accent for winner/high stats, dim for below-average stats
- [ ] **1.12** Verify friendly match flow end-to-end:
  - Create friendly → register pairs → matchmaking → live scoreboard with BWF layout → record matches → game-by-game scores → completion → stories → share

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] Friendly match flow works without importing from deleted files
- [ ] FriendlyScoreboard renders BWF-style player identity cards for every participant
- [ ] Game-by-game scores (G1, G2, G3) expandable below completed matchups
- [ ] Series history bar shows correct club record

---

### Week 2 — Public Proof Pages (BWF Style)

**Goal:** Build opt-in public match, session, and friendly pages with BWF-style layout and OG meta tags for WhatsApp link previews. These are the highest-leverage missing piece for the WhatsApp distribution thesis — the public page IS the recruitment surface.

**Design reference:** `mockups/friendly/friendly_scoreboard_mockup.html` (Phone 3: Public Proof Page)

**Files affected:** `src/pages/PublicMatchPage.tsx` (new), `src/pages/PublicSessionPage.tsx` (new), `src/pages/PublicFriendlyPage.tsx` (new), `src/App.tsx` (routes), `src/lib/api.ts` (add public fetch functions), `supabase/migrations/` (RLS for public read), `src/components/` (share buttons), `src/components/PlayerIdentityCard.tsx` (reuse from Week 1)

- [ ] **2.1** Add Supabase RPC or RLS rule for opt-in public read access on matches, sessions, and friendlies (respect club-level `public_visible` flag)
- [ ] **2.2** **Build `PublicFriendlyPage.tsx`** — BWF-style public friendly page (this is the highest-leverage page for WhatsApp sharing). Must include:
  - KelabSukan branding header ("KelabSukan Live Sports Network")
  - Compact BWF scoreboard: two club names side-by-side with city, big score (lime for winner), series record bar below
  - Full matchup list with all pair names, scores, and game-by-game details (G1, G2, G3)
  - Player Identity Cards for 2-4 featured players (reuse `PlayerIdentityCard.tsx` from Week 1) — shows rank badge, W-L, win rate, form
  - "Join KelabSukan" CTA button (lime on dark, full width)
  - OG meta tags: title = "LEP BC 3-2 Smashers PJ | KelabSukan", description = matchup summary with decisive match detail, image = scoreboard card, url = public link
- [ ] **2.3** Build `PublicMatchPage.tsx` — BWF-style single match page:
  - Player identity cards for both sides (avatar, name, club, rank, W-L)
  - Score display with game-by-game breakdown (G1, G2, G3)
  - Winner highlighted in lime, loser dimmed
  - OG meta tags
- [ ] **2.4** Build `PublicSessionPage.tsx` — displays:
  - Session recap (headline, date, venue)
  - List of matches with scores (BWF-style matchup rows)
  - Leaderboard snapshot (top 3-5 players with identity cards)
  - OG meta tags
- [ ] **2.5** Add routes in `src/App.tsx`: `/public/friendly/:friendlyId`, `/public/match/:matchId`, `/public/session/:sessionId`
- [ ] **2.6** Add opt-in public visibility toggle on club settings page (add `public_visible` boolean column, default false)
- [ ] **2.7** Wire share buttons on existing match/session/friendly pages to copy the public proof link
- [ ] **2.8** Style public pages with same dark arena design system — they are the landing surface for new users coming from WhatsApp
- [ ] **2.9** Verify WhatsApp OG preview renders correctly (test with opengraph.dev): title, description, image all appear, link is clickable

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] Visit `/public/friendly/:id` — renders without auth, shows BWF-style scoreboard + player identity cards
- [ ] Visit `/public/match/:id` — shows player identity cards + game-by-game scores
- [ ] OG meta tags appear in page source (test with opengraph.dev or similar)
- [ ] WhatsApp link preview fetches title + description correctly

---

### Week 3 — Ranking Deltas & BWF Player Identity Integration

**Goal:** Make rankings feel alive by showing rank changes (up/down arrows), tier badges (Bronze/Silver/Gold/Platinum), and win rate. Integrate into `PlayerIdentityCard.tsx` so every player display across the app shows rank + stats. Wire the existing `get_player_dashboard` RPC to eliminate redundant per-club fetches.

**Files affected:** `src/pages/DashboardPage.tsx`, `src/pages/ClubLeaderboardPage.tsx`, `src/components/RankBadge.tsx` (new), `src/components/RankDelta.tsx` (new), `src/components/WinRateBar.tsx` (new), `src/components/PlayerIdentityCard.tsx` (update), `src/lib/api.ts`, `src/lib/hooks/` (dashboard hook)

- [ ] **3.1** Design rank delta indicator — green arrow up for gain, red arrow down for loss, gray dash for unchanged. Integrate into `PlayerIdentityCard` stat row.
- [ ] **3.2** Design tier badge system:
  - Bronze: win rate < 40% or Elo < 1000
  - Silver: win rate 40-60% or Elo 1000-1200
  - Gold: win rate 60-80% or Elo 1200-1400
  - Platinum: win rate > 80% or Elo > 1400
  - Style: compact colored badge with icon, fits as rank badge overlay on player avatar (like BWF #1, #2 badges)
- [ ] **3.3** Design win rate component — horizontal bar (percentage filled) or ring. Color shifts green→amber→red
- [ ] **3.4** Build `RankBadge` component — tier icon + label, accepts `tier: 'bronze' | 'silver' | 'gold' | 'platinum'`
- [ ] **3.5** Build `RankDelta` component — arrow + number, accepts `delta: number` (positive/negative/zero)
- [ ] **3.6** Build `WinRateBar` component — percentage bar, accepts `rate: number` (0-100)
- [ ] **3.7** **Update `PlayerIdentityCard.tsx`** to accept and render: `rankBadge` (tier), `rankDelta` (arrow), `winRate` (bar). The stat row becomes: rank badge + W-L + win rate bar + form arrow. The avatar gets a rank badge overlay (BWF style).
- [ ] **3.8** Wire `get_player_dashboard` RPC in a new dashboard data hook — replace inline `useClubsMatches` + `useClubsMembers` calls at `DashboardPage.tsx:60-61`
- [ ] **3.9** Integrate PlayerIdentityCard (with rank + stats) into `DashboardPage.tsx`
- [ ] **3.10** Integrate RankDelta into `ClubLeaderboardPage.tsx` — show delta for every player in the list
- [ ] **3.11** Remove unused `useClubsMatches` and `useClubsMembers` imports from DashboardPage after wiring RPC
- [ ] **3.12** Ensure the dashboard RPC returns delta and tier data (may need migration update)

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] Dashboard shows PlayerIdentityCard with rank badge + delta + win rate bar
- [ ] `PlayerIdentityCard.tsx` renders correctly in FriendlyScoreboard, Dashboard, and public pages
- [ ] Leaderboard shows delta for each player
- [ ] No redundant per-club API calls on dashboard (verify network tab)

---

### Week 4 — Push Notifications

**Goal:** Notify players when their rank changes, a match result is recorded, a session reminder fires, or they are mentioned in a story.

**Files affected:** `supabase/migrations/` (push subscription table), `src/lib/notifications.ts` (new), `src/hooks/usePushNotifications.ts` (new), `public/service-worker.js` (or sw.ts), `src/pages/SettingsPage.tsx` (preferences UI), `src/lib/api.ts` (notification functions)

- [ ] **4.1** Set up Supabase Realtime infrastructure — enable Realtime on relevant tables (matches, rankings, sessions)
- [ ] **4.2** Design notification type system: `rank_change`, `match_result`, `session_reminder`, `story_mention`, `friendly_challenge`
- [ ] **4.3** Create migration for push subscription table:
  ```sql
  CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, endpoint)
  );
  ```
- [ ] **4.4** Build `src/lib/notifications.ts`:
  - `subscribe()` — saves push subscription to DB
  - `unsubscribe()` — removes subscription
  - `sendNotification(userId, type, payload)` — called from server-side triggers or Edge Functions
- [ ] **4.5** Build `src/hooks/usePushNotifications.ts`:
  - Request permission on mount
  - Register/unregister service worker
  - Save subscription to backend
- [ ] **4.6** Create or update service worker at `public/sw.js` to handle push events and show notifications
- [ ] **4.7** Wire triggers:
  - On match recorded → push to match participants
  - On rank change (detected in dashboard RPC or migration) → push to affected player
  - On session start (time-based or cron) → push to RSVP'd members
- [ ] **4.8** Add notification preferences UI in settings page — toggle per notification type
- [ ] **4.9** Add VAPID keys configuration for web push (env vars)

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] Browser requests notification permission on login flow
- [ ] Recording a match triggers a push to participants
- [ ] Notification preferences save correctly

---

### Week 5 — Monolith Breakup

**Goal:** Split the 2,149-line `api.ts` into domain-specific modules. Split the 1,017-line `SuperAdminAnalyticsPage.tsx`. Split the 999-line `ScoreRecordingModal.tsx`.

**Files affected:** `src/lib/api.ts` (split & delete), `src/lib/api/` (new directory), all files importing from `api.ts`, `src/pages/SuperAdminAnalyticsPage.tsx`, `src/components/ScoreRecordingModal.tsx`, `src/features/admin/` (new)

- [ ] **5.1** Map all exports in `api.ts` to domain categories:
  - Club: club CRUD, members, settings, invites
  - Match: match CRUD, scores, ranking, Elo
  - Event: sessions, RSVPs, check-in, court queue
  - Profile: user profiles, stats, achievements, badges
  - Notification: notification CRUD, preferences, subscriptions
- [ ] **5.2** Create `src/lib/api/clubs.ts` — move all club-related functions
- [ ] **5.3** Create `src/lib/api/matches.ts` — move all match/score/ranking functions
- [ ] **5.4** Create `src/lib/api/events.ts` — move all event/session functions
- [ ] **5.5** Create `src/lib/api/profiles.ts` — move all profile/stat functions
- [ ] **5.6** Create `src/lib/api/notifications.ts` — move all notification functions
- [ ] **5.7** Create `src/lib/api/index.ts` — barrel re-export with backward-compatible names
- [ ] **5.8** Update all imports across the codebase to use `@/lib/api/clubs` etc.
- [ ] **5.9** Delete `src/lib/api.ts` (or keep as thin re-export wrapper temporarily)
- [ ] **5.10** Split `SuperAdminAnalyticsPage.tsx` (1,017 lines) into `src/features/admin/`:
  - `AnalyticsOverview.tsx`
  - `ClubManagement.tsx`
  - `UserManagement.tsx`
  - `SystemHealth.tsx`
  - `AdminLayout.tsx`
- [ ] **5.11** Split `ScoreRecordingModal.tsx` (999 lines) into hooks:
  - `useScoreRecording.ts` — match creation, validation, submission
  - `usePlayerSelection.ts` — player search, pair selection
  - `ScoreRecordingUI.tsx` — presentational component

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] All existing pages work without importing from `api.ts`
- [ ] Score recording works end-to-end
- [ ] Super admin analytics renders all sections correctly

---

### Week 6 — Polish & Launch (BWF Design Audit)

**Goal:** Final visual audit against BWF broadcast style, end-to-end testing, preview deploy, production launch.

**Design reference:** `mockups/friendly/friendly_scoreboard_mockup.html`

**Files affected:** All — audit pass

- [ ] **6.1** Full visual audit against Live Sports Network + BWF broadcast reference:
  - Arena background is `#040d0f` everywhere
  - Lime accent (`#ccff00`) used for actions, status, and highlights — not decoration
  - Panels have thin glowing borders and glassy fill
  - **Player Identity Cards render on every page that shows player info** (avatar + rank badge + W-L + win rate + form)
  - **FriendlyScoreboard uses BWF layout**: match header with player cards side-by-side, series history bar, matchup rows with avatars, game-by-game scores, decider badge
  - **Public proof pages** show branded scoreboard, full matchups, player cards, and "Join KelabSukan" CTA
- [ ] **6.2** Check mobile 390px viewport on all key routes: dashboard, club home, friendly scoreboard, session, leaderboard, settings, public proof pages
- [ ] **6.3** Check desktop 1440px viewport on all key routes
- [ ] **6.4** Fix any remaining hardcoded colors (`bg-[#0b1322]`, `text-[#...]`, `border-[#...]`)
- [ ] **6.5** Verify all 7 CSS variables render correctly — inspect each in dev tools
- [ ] **6.6** End-to-end test flow:
  - Create club → add member → create session → record match → view story → share public link → open public page
  - **Friendly flow**: create friendly → register pairs → matchmaking → live scoreboard (BWF style) → record matches → game-by-game scores → completion → stories → share
- [ ] **6.7** Test WhatsApp share flow end-to-end — public link opens correctly with OG preview showing BWF-style scoreboard card
- [ ] **6.8** Run full audit: lint, test, build — all pass
- [ ] **6.9** Deploy preview to Netlify
- [ ] **6.10** Owner review of preview URL — check BWF layout on mobile + desktop
- [ ] **6.11** Owner explicit approval for production
- [ ] **6.12** Deploy to production
- [ ] **6.13** Verify production URL post-deploy — all pages render, auth works, match recording works, friendly scoreboard renders correctly

**Verify:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — pass
- [ ] `npm run build` — pass
- [ ] Production URL verified
- [ ] Supabase migration status confirmed if data changed
- [ ] Friendly scoreboard renders BWF-style on mobile and desktop
- [ ] Public proof page shows player identity cards + OG preview

---

## Appendix: Quick Reference

### Key File Paths
| File | Lines | Note |
|---|---|---|
| `src/index.css` | 99 | Must add 7 CSS variables |
| `src/App.css` | ~470 | Rebuild panel classes |
| `src/lib/api.ts` | 2,149 | Split in Week 5 |
| `src/lib/friendlyApi.ts` | 449 | Delete in Week 1 |
| `src/lib/friendlyStoryMoments.ts` | 421 | Delete in Week 1 |
| `src/lib/storyMoments.ts` | 333 | Merge target in Week 1 |
| `src/pages/DashboardPage.tsx` | — | Fix lines 60-61 in Week 3 |
| `src/pages/SuperAdminAnalyticsPage.tsx` | 1,017 | Split in Week 5 |
| `src/components/ScoreRecordingModal.tsx` | 999 | Split in Week 5 |
| `src/components/ui/button.tsx` | — | Fix in Week 0 |
| `src/components/ui/badge.tsx` | — | Fix in Week 0 |
| `src/pages/LandingPage.tsx` | — | Define missing classes in Week 0 |
| `src/components/PlayerIdentityCard.tsx` | — | Build in Week 1. Used by: FriendlyScoreboard, Dashboard, PublicFriendlyPage |
| `src/components/friendly/FriendlyScoreboard.tsx` | 245 | Rebuild in Week 1 with BWF layout |
| `src/components/friendly/FriendlyShareCard.tsx` | 346 | Rebuild in Week 1 with BWF layout |
| `src/pages/PublicFriendlyPage.tsx` | — | New in Week 2. Public proof page for friendly results |
| `supabase/migrations/20260611000000_player_dashboard_rpc.sql` | 361 | Wire in Week 3 |
| `mockups/friendly/friendly_scoreboard_mockup.html` | — | Design reference for BWF-style scoreboard, matchmaking grid, and public proof page |

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
