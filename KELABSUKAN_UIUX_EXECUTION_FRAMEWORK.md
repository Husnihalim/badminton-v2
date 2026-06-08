# KelabSukan UI/UX Execution Framework

## Purpose

This document is the working rulebook for KelabSukan UI/UX development.

It exists to prevent trial-and-error redesign, accidental production changes, scattered styling, and product drift away from `KELABSUKAN_TRUE_NORTH.md`.

Read these documents before starting any UI/UX work:

1. `KELABSUKAN_TRUE_NORTH.md`
2. `KELABSUKAN_UIUX_REQUIREMENTS.md`
3. This document

The goal is to develop KelabSukan efficiently, with fewer mistakes, clear review points, and scalable foundations.

## Product Lock

KelabSukan is not ordinary club management software.

KelabSukan is:

> A Live Sports Network for amateur clubs, where players, game nights, rankings, stories, rivalries, and share cards make ordinary sessions feel important.

Every UI/UX change must support at least one of these outcomes:

- make players feel seen
- make clubs feel alive
- make game day feel live
- turn stats into stories
- make moments easy to share back into WhatsApp and social media
- let admins operate efficiently without making the product feel like admin software

If a proposed screen, component, or section does not support those outcomes, it should be removed, redesigned, or deferred.

## Approved Visual Direction

The approved direction is the KelabSukan Live Sports Network reference:

- dark arena base
- electric lime action and status color
- electric blue as a secondary live/status accent
- thin glowing borders
- sports-broadcast panels
- scoreboard-style number tiles
- condensed sports headline typography
- compact readable interface labels
- mobile-first phone surfaces
- player identity cards
- club newsroom blocks
- game-day live panels
- share-card-ready compositions

The visual system should feel like:

- a grassroots sports broadcast
- a club sports channel
- an athlete identity platform
- a live game-night control surface
- a WhatsApp/social-sharing story engine

It must not feel like:

- generic SaaS
- a spreadsheet replacement
- a booking system
- random marketing blocks
- bright unrelated feature sections
- admin software as the main product experience

## Mandatory Build Sequence

Every UI/UX phase must follow this sequence:

```text
spec -> preview -> review -> real route -> checks -> preview deploy -> approval -> production
```

Meaning:

1. **Spec**
   Write the goal, target users, screen purpose, visual direction, required sections, data needs, and acceptance criteria.

2. **Preview**
   Build or update a safe preview surface before changing the real user route when the change is visually significant.

3. **Review**
   Compare the coded preview with the approved visual direction and product purpose.

4. **Real Route**
   Apply the approved design to the actual route only after the preview direction is accepted.

5. **Checks**
   Run local validation: lint, tests, and build.

6. **Preview Deploy**
   Deploy to a draft/preview URL when the change affects user-facing UI.

7. **Approval**
   Production deploy requires explicit approval after the preview is reviewed.

8. **Production**
   Deploy only the approved, scoped, validated state.

## Phase Gates

### Phase 0: Execution Framework

Goal:

Create the development rulebook before more UI work.

Outcome:

- this document exists
- future UI work has gates, done criteria, and release rules
- no app UI changes are made in this phase

Done when:

- the framework defines product lock, phase order, preview rules, checks, and production rules

### Phase 1: Design System Foundation

Goal:

Build reusable visual foundations before redesigning full pages.

Develop:

- arena background tokens
- panel/card styles
- electric lime primary actions
- live/status chips
- scoreboard tiles
- player stat tiles
- story cards
- admin panels
- section headers
- compact metadata labels
- mobile bottom-navigation direction

Expected look:

- dark, premium, sports-broadcast UI
- thin borders and controlled glow
- lime used for action/status, not decoration everywhere
- clean, consistent panels instead of one-off cards

Done when:

- reusable components can support player, club, game-day, story/share, and admin screens
- no major page rewrite is required to test the design system
- mobile and desktop layouts are checked
- lint, tests, and build pass

### Phase 2: Preview Lab

Goal:

Create a safe review surface for UI direction.

Develop:

- a preview route or preview page that shows key components with sample data
- player card sample
- club headline sample
- game-day live sample
- story cards
- share card previews
- admin panel sample

Expected look:

- a controlled UI test bench
- not public marketing
- not a replacement for real routes

Done when:

- the visual direction can be reviewed without logging in or changing production pages
- the preview shows the main component families
- the preview matches the approved dark arena sports-network direction

### Phase 3: Player Card

Goal:

Build the atomic media asset of KelabSukan.

Develop:

- player identity header
- photo/avatar
- name, club, city, sport
- rank/rating
- win rate
- current form
- streak
- best partner
- main rival
- signature moment
- share/follow action

Expected look:

- athlete card, not account profile
- strong name treatment
- rank and stats feel like sports identity
- story/rival/partner blocks support personal stakes

Done when:

- player card works with real user data
- missing stats have intentional empty states
- mobile layout is strong
- desktop layout does not feel stretched

### Phase 4: Player Home / Dashboard

Goal:

Make signed-in home personal and worth opening.

Develop:

- tonight / next game hero
- my player card
- rank, form, streak, win rate
- rivalry watch
- latest story involving me
- quick score entry
- clubs I belong to
- upcoming sessions
- recent match results

Expected look:

- player-first mobile sports home
- personal status before admin/setup actions
- stories and rankings feel like reasons to return

Done when:

- `/dashboard` answers what is next, what changed, and what action matters
- existing auth and club discovery still work
- preview deploy is approved before production

### Phase 5: Club Homepage

Goal:

Make every club feel like its own sports channel.

Develop:

- club hero
- live/upcoming session
- current headline
- club stats
- leaderboard preview
- featured players
- recent match reports
- upcoming sessions
- admin quick actions for admins only

Expected look:

- club identity at the top
- live/next session is obvious
- headlines and leaderboard appear before admin controls
- page feels alive, not like a list of events

Done when:

- club page communicates activity, stories, rankings, and players
- admin actions are present but secondary
- member view and admin view are clearly separated

### Phase 6: Game Day Live

Goal:

Make a normal session feel live.

Develop:

- event hero
- venue, date, time
- RSVP counts
- checked-in players
- live court status
- court queue
- current match score
- record score action
- session MVP
- session leaderboard
- live feed
- end-session recap placeholder

Expected look:

- mobile-first court-side surface
- live badge and active court state are obvious
- score and queue panels feel like a sports control room

Done when:

- the page can be used beside the court
- main live state is clear within 3 seconds
- score entry remains easy to reach

### Phase 7: Score Recording Payoff

Goal:

Make recording a score fast, accurate, and rewarding.

Develop:

- singles/doubles selection
- player selection
- score entry
- winner confirmation
- saved result card
- share caption preview

Expected look:

- large touch targets
- minimal typing
- clear winner state
- immediate score/story payoff after save

Done when:

- score entry is faster on mobile
- user sees a useful result after saving
- existing match save behavior remains intact

### Phase 8: Story Cards V1

Goal:

Turn stats into selected story moments.

Develop:

- match recap card
- rivalry watch card
- comeback card
- weekly champion card
- partnership card
- player spotlight card

Expected look:

- strong headline
- proof stat or score
- club/date context
- player visual or avatar
- short, human, friendly-banter copy

Done when:

- stories are deterministic and proof-based
- stories do not feel robotic
- stories do not poke sensitive topics
- cards work in player, club, and game-day contexts

### Phase 9: Share Cards

Goal:

Make KelabSukan moments travel through WhatsApp and social platforms.

Develop:

- scorecard share preview
- rivalry share preview
- comeback share preview
- player spotlight share preview
- weekly champion share preview
- WhatsApp-ready caption

Expected look:

- readable at phone-chat size
- KelabSukan brand visible
- score/proof stat is prominent
- image + caption + link work together

Done when:

- share preview is readable in compact format
- caption is useful without heavy editing
- shared link returns people to the right KelabSukan context

### Phase 10: Story Selection Engine

Goal:

For sessions with many matches, choose the right stories instead of showing everything.

Develop:

- story candidate generation
- story scoring
- session-level selection
- admin review/hide/approve controls

Expected output for a 10-20 match session:

- 1 main recap
- 3 to 5 highlight stories
- up to 3 small funny mentions
- no flood of full stories for every match

Done when:

- selected stories feel smart, not noisy
- repeated player/story domination is controlled
- admin can hide or approve candidates before wider visibility

### Phase 11: Landing Page Public Sports Front Page

Goal:

Rebuild the landing page only after internal player, club, and game-day language is stable.

Develop:

- dark arena hero
- clear KelabSukan identity
- one main featured story
- rotating featured story cards
- featured clubs
- player spotlight
- how it works
- join/create CTA

Expected look:

- public grassroots sports front page
- real club energy and community imagery
- not bright generic marketing
- every block supports player/club/story/share loop

Done when:

- landing does not feel like SaaS
- no unrelated feature blocks appear
- no private data is exposed
- preview is approved before production

### Phase 12: Admin Command Center

Goal:

Make admin work efficient without making the whole product feel like admin software.

Develop:

- pending approvals
- member roles
- invite links
- event setup
- RSVP controls
- club branding
- announcements
- safety/danger zone

Expected look:

- calmer and denser than member screens
- clear rows and grouped controls
- destructive actions isolated
- still belongs to the Live Sports Network visual system

Done when:

- admins can complete work faster
- member-facing pages are not dominated by admin controls
- permissions remain strict

## Definition Of Done For UI/UX Work

A UI/UX phase is done only when:

- purpose is written
- target user is clear
- screen type is identified: member, club, game-day, story/share, admin, or public
- design follows the approved visual direction
- mobile layout is checked
- desktop layout is checked
- no text overlaps
- no button overflows
- contrast is readable
- admin-only actions are not primary member actions
- share action appears where story/share value exists
- lint passes
- tests pass
- build passes
- preview deploy is reviewed before production

## Scope Control Rules

Do not:

- redesign multiple major routes in one pass
- build landing page before core internal language is stable
- deploy production without preview approval
- deploy from a dirty or unclear worktree
- mix unrelated UI changes into one commit
- create one-off styles when a reusable component is needed
- let admin UX dominate member UX
- expose private player or club content publicly
- generate stories without proof
- write mean-spirited or sensitive banter
- add random sections because they look good

## Production Release Rules

Production deploy is allowed only after:

1. scope is clear
2. preview has been reviewed
3. lint, tests, and build pass
4. changed files are understood
5. unrelated dirty files are excluded
6. user explicitly approves production release

Preview deploy is required for:

- landing page changes
- dashboard/player home changes
- club homepage changes
- game-day changes
- share card changes
- major visual system changes

Documentation-only changes do not require app tests or preview deploy.

## First Implementation After This Framework

The next implementation phase should be:

> Phase 1: Design System Foundation

Do not start with the landing page.

Reason:

The previous landing redesign drifted because the app did not yet have stable reusable sports-network components. The correct next step is to build the visual foundation, then preview the components, then apply them to real routes phase by phase.
