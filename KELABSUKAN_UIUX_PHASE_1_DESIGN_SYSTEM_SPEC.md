# KelabSukan UI/UX Phase 1: Design System Foundation Spec

## Purpose

Phase 1 builds the reusable visual foundation for KelabSukan before any major real-route redesign.

This phase exists because previous UI work showed a clear risk: if full pages are redesigned before the shared visual system is stable, the result can drift into bright generic marketing, unrelated blocks, or inconsistent page-specific styling.

Phase 1 is not a landing-page redesign.

Phase 1 is not a dashboard rewrite.

Phase 1 creates the system that later pages must use.

## Product Goal

Make KelabSukan visually and structurally capable of becoming:

> A Live Sports Network for amateur clubs, where players, game nights, rankings, stories, rivalries, and share cards make ordinary sessions feel important.

The foundation must support these screen types:

- public landing / media front page
- signed-in player home
- player card / profile
- club sports channel
- game-day live
- score recording payoff
- story cards
- share cards
- admin command center

## Success Outcome

At the end of Phase 1, an implementer should be able to build a new KelabSukan screen without inventing a new visual style.

The system should already provide:

- the correct background feel
- the correct panel style
- the correct button style
- the correct status chips
- the correct score/stat tiles
- the correct story-card frame
- the correct admin-panel style
- the correct preview surface to review components

## Approved Visual Essence

The visual essence comes from the approved Live Sports Network references:

- dark arena environment
- electric lime action/status accent
- controlled electric blue live/status accent
- thin glowing borders
- sports-broadcast panels
- scoreboard-style number tiles
- player identity cards
- club newsroom blocks
- game-day live control panels
- WhatsApp/share-card-ready composition
- compact mobile-first UI

Avoid:

- bright generic marketing palette
- generic SaaS dashboard cards
- random decorative gradients
- one-off page-specific styling
- oversized rounded cards that feel cheap
- admin-first member experience

## Phase 1 Non-Goals

Do not do these in Phase 1:

- do not redesign landing page
- do not redesign dashboard
- do not redesign club homepage
- do not redesign game-day page
- do not add new Supabase migrations
- do not change auth, score saving, membership, or invite logic
- do not deploy production
- do not expose any private data publicly

Phase 1 may create a preview route or preview page, but only for visual review.

## Workstream 1: Tokens And Surfaces

### Goal

Define the base visual language that all future screens use.

### Owner

Token and surface owner.

### Primary Files

- `src/index.css`
- `src/App.css`

Only one active agent should own these files at a time.

### Required Outputs

Define CSS variables or reusable classes for:

- arena background
- foreground/text hierarchy
- muted text
- electric lime accent
- electric blue accent
- warning/heat accent
- danger/loss accent
- panel background
- elevated panel background
- admin panel background
- border color
- glow border
- shadow/glow levels
- sports headline role
- compact label role

### Visual Rules

- Lime is for actions, live status, winning/state emphasis, and major CTAs.
- Blue is secondary for live indicators, links, and system highlights.
- Red is only for danger, loss, or destructive action.
- Background should feel like an arena, not a flat black page.
- Glow must be controlled and readable, not decorative noise.

### Acceptance Criteria

- Tokens support dark sports-network UI.
- Existing light/dark behavior is not accidentally broken.
- Shared tokens do not force every page into a one-note lime theme.
- Body, main layout, nav, and existing app shell remain usable.

## Workstream 2: Primitive UI Components

### Goal

Upgrade reusable base components so future screens do not create one-off button/card/badge styles.

### Owner

Primitive UI owner.

### Primary Files

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/page.tsx`

### Required Outputs

Add or define component variants for:

- primary live action
- secondary panel action
- ghost icon action
- destructive action
- arena card
- live panel
- score/stat panel
- admin panel
- status badge
- live badge
- warning/heat badge
- neutral metadata badge

### Visual Rules

- Buttons use icons where appropriate.
- Primary action should use electric lime only when it is truly primary.
- Cards should stay compact, with 8px-ish radius unless a specific surface needs otherwise.
- Admin panels should be calmer and denser than player/story panels.

### Acceptance Criteria

- Variants are reusable and named by purpose, not by one page.
- Existing component imports continue to work.
- No business logic is added to primitive components.

## Workstream 3: Sports-Network Components

### Goal

Create feature-neutral components that express KelabSukan's product identity.

### Owner

Sports components owner.

### Recommended Location

- `src/components`

### Required Components

Create reusable components or component contracts for:

- `LiveStatusChip`
- `ScoreboardTile`
- `PlayerStatTile`
- `SectionHeader`
- `MetadataLabel`
- `StoryCard`
- `ClubHeadlineCard`

### Component Behavior

These components should:

- accept plain props
- not call Supabase directly
- not depend on route params
- support loading/empty-friendly text
- work with mock data in preview

### Visual Rules

- Scoreboard numbers should be large and readable.
- Labels should be compact and uppercase only where useful.
- Story cards must have a headline, proof/stat area, and context.
- Club headline cards should feel editorial, not like generic list rows.

### Acceptance Criteria

- Components can be used in preview without auth.
- Components do not duplicate route-specific logic.
- Mobile layout is stable with long names and numbers.

## Workstream 4: Admin Components

### Goal

Create admin surfaces that are efficient without making KelabSukan feel like admin software.

### Owner

Admin components owner.

### Recommended Location

- `src/components/admin`
- or shared `src/components/ui` only if truly generic

### Required Components

Create reusable components or component contracts for:

- `AdminPanel`
- `ApprovalRow`
- `InviteLinkCard`
- `SettingRow`
- `DangerZonePanel`

### Visual Rules

- Admin surfaces are calmer and denser.
- Approve/reject actions must be clear.
- Destructive actions must be visually isolated.
- Admin controls should not look like the main emotional product experience.

### Acceptance Criteria

- Admin components can later support settings and members pages.
- Permission logic is not added inside visual-only components.
- Component props are explicit and simple.

## Workstream 5: Preview Lab

### Goal

Provide one reviewable screen that proves the design system before real route redesign.

### Owner

Preview lab owner.

### Primary Files

- existing preview page if appropriate
- `src/App.tsx` only if a new route must be registered

Only one agent should own route registration.

### Required Preview Sections

The preview should show:

- arena background sample
- button and badge variants
- player card sample
- club headline sample
- game-day live sample
- scoreboard tiles
- story cards
- share-card sample
- admin panel sample

### Preview Rules

- Use mock data only.
- Do not require login.
- Do not call Supabase.
- Do not replace the landing page.
- Do not claim this is production UI.

### Acceptance Criteria

- Owner can open one route and review the visual direction.
- Preview works on mobile and desktop.
- No horizontal overflow.
- Text remains readable.
- Every component family is represented.

## Workstream 6: QA And Review

### Goal

Verify the design-system foundation before any real app routes depend on it.

### Owner

QA agent.

### Required Checks

Run:

```bash
npm run lint
npm run test
npm run build
```

Also check:

- mobile layout
- desktop layout
- no text overlap
- no button overflow
- readable contrast
- components still work with long names
- dark theme readability
- admin panels do not dominate player/story surfaces

### Acceptance Criteria

- all local checks pass
- preview route reviewed
- QA notes list any visual defects
- no production deploy happens in Phase 1 without approval

## Parallelization Plan

Phase 1 can be parallelized carefully after the phase spec is approved.

Recommended order:

1. Token and surface owner defines base CSS contract.
2. Primitive UI owner defines component variants.
3. Sports components owner builds feature-neutral sports components.
4. Admin components owner builds admin surfaces.
5. Preview lab owner composes the review route.
6. QA owner verifies.

Parallel work is allowed only if file ownership is clear.

Do not let multiple agents edit `src/index.css`, `src/App.css`, or `src/App.tsx` at the same time.

## Expected Owner Review Outcome

After Phase 1, the owner should be able to review a preview and answer:

- Does this feel like KelabSukan Live Sports Network?
- Does it match the first mockup essence?
- Does it avoid the too-bright landing-page mistake?
- Are the cards, buttons, panels, and stats clean enough?
- Can this foundation support player home, club page, game day, stories, share cards, and admin?

If the answer is yes, Phase 2 can begin.

If the answer is no, adjust the design system before touching real user routes.

## Definition Of Done

Phase 1 is complete only when:

- design tokens exist
- base component variants exist
- sports-network components exist or have clear contracts
- admin components exist or have clear contracts
- preview lab demonstrates the system
- mobile and desktop review is complete
- lint passes
- tests pass
- build passes
- owner approves the direction

## Handoff Requirements

Each Phase 1 agent must report:

- role
- branch/worktree
- owned files
- files changed
- components created or changed
- checks run
- checks not run
- screenshots or preview route if applicable
- risks or follow-up work

The lead agent must update `KELABSUKAN_PHASE_CONTROL.md` after Phase 1 review.

## Next Phase

After Phase 1 approval, proceed to:

> Phase 2: Preview Lab stabilization or Player Card implementation, depending on whether the preview route is complete enough during Phase 1.

Do not begin landing-page redesign until the internal player, club, game-day, and share-card language is stable.
