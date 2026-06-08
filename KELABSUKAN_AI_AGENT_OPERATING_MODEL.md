# KelabSukan AI Agent Operating Model

## Purpose

This document defines how AI agents should collaborate on KelabSukan without creating merge conflicts, product drift, accidental deployments, or unclear ownership.

KelabSukan can use multiple AI agents, but only under controlled engineering rules.

The goal is:

- faster parallel work
- fewer mistakes
- clear ownership
- clean Git history
- scalable implementation
- strict alignment with `KELABSUKAN_TRUE_NORTH.md`

## Core Rule

Do not run many agents freely in the same working tree.

Use a small AI team:

- one lead/integrator agent
- three to five active specialist agents
- one owner approval point

More agents are not automatically better. Parallel work is useful only when each agent owns a clear, non-overlapping scope.

## Operating Principle

The lead agent acts like a technical project manager and principal engineer combined.

The lead agent must:

- define the phase
- split work into safe lanes
- assign file ownership
- keep agents out of shared collision areas
- review outputs
- run or request verification
- integrate branches in the correct order
- keep the owner informed in plain language

Specialist agents should not decide roadmap, scope, production release, or cross-cutting architecture unless specifically assigned.

## Agent Roles

### AI Project Manager

Owns:

- phase sequencing
- task breakdown
- owner-readable status
- acceptance criteria
- handoffs
- scope control
- keeping work aligned with true north

Does not own:

- production code changes
- database schema
- deployment
- final production approval

### Principal Engineer

Owns:

- technical architecture
- file/module ownership
- data boundaries
- privacy and security tradeoffs
- merge order
- deciding what can run in parallel
- deciding when work must stay single-threaded

Does not own:

- marketing copy
- final visual taste
- production release without approval

### UI/UX Agent

Owns:

- screen purpose
- user flows
- information hierarchy
- visual direction
- component behavior
- empty states
- mobile-first experience
- matching the approved mockup essence

Does not own:

- production route rewrites without implementation approval
- database contracts
- deployment
- inventing unrelated landing sections

### Senior Frontend Agent

Owns:

- React and TypeScript implementation
- reusable UI components
- responsive behavior
- route integration when assigned
- preserving existing auth and data flows
- frontend tests for changed behavior

Does not own:

- product scope
- Supabase security behavior
- deployment decisions
- changing many major routes at once

### Backend / Supabase Agent

Owns:

- database migrations
- RLS policies
- RPC functions
- API helper contracts
- ranking/story data
- invite and approval logic
- privacy and public visibility rules

Does not own:

- visual styling
- marketing copy
- Netlify deployment
- frontend-only assumptions about security

### QA Agent

Owns:

- lint, test, and build verification
- changed-file review
- regression checks
- mobile and desktop checks
- text overflow
- button overflow
- contrast
- member/admin separation
- route and permission checks

Does not own:

- scope changes
- production approval
- implementation fixes unless explicitly assigned

### Deployment Agent

Owns:

- preview deploys
- production deploys only after approval
- Netlify state
- clean build artifact checks
- deploy ID and URL reporting
- live HTTP verification
- separating local pass from live production proof

Does not own:

- product approval
- code design
- database schema
- deploying from a dirty or unclear worktree

### Marketing / Story Agent

Owns:

- story tone
- WhatsApp captions
- social share copy
- sponsor-safe language
- public editorial rules
- friendly banter boundaries

Does not own:

- app architecture
- backend story persistence
- private data exposure decisions
- early landing-page rebuilds before internal product language is stable

## Git And Worktree Rules

Use one branch or worktree per active work lane.

Recommended branch names:

```text
codex/ui-design-system
codex/ui-preview-lab
codex/player-card
codex/player-home
codex/club-homepage
codex/game-day-live
codex/share-cards
codex/story-engine
codex/supabase-contract
codex/qa-phase-1
```

Recommended worktree pattern:

```bash
git worktree add ../badminton-v2-ui-design-system -b codex/ui-design-system
git worktree add ../badminton-v2-player-home -b codex/player-home
git worktree add ../badminton-v2-supabase -b codex/supabase-contract
```

Each worktree should start from a clean intended base branch.

If the current checkout is dirty, do not start multiple agents in it.

## File Ownership Rules

Before any agent starts, the lead agent must record:

- branch/worktree name
- phase
- agent role
- owned files or modules
- files the agent must not touch
- expected output
- verification required

An agent should stop and report if a target file is already dirty and not part of its assigned ownership.

## High-Risk Collision Files

Only one active owner should edit these at a time:

- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- `src/App.css`
- `src/lib/api.ts`
- `src/context/AuthContext.tsx`
- `src/context/NotificationsContext.tsx`
- `src/types/database.ts`
- `netlify.toml`
- `supabase/migrations`
- `KELABSUKAN_TRUE_NORTH.md`

Parallel agents may inspect these files, but should not edit them unless explicitly assigned.

## Supabase Rules

Supabase work is high risk.

Only one backend/Supabase agent should own database changes in a phase.

Rules:

- migrations are append-only
- do not edit an already-applied migration unless explicitly repairing migration history
- every database change must include frontend contract review
- every database change must consider RLS and privacy
- run a dry-run migration check before live apply when possible
- never claim production database status without verifying remote state

Required local check for Supabase work when available:

```bash
npx supabase db push --linked --dry-run --include-all
```

Live database apply requires explicit approval.

## Deployment Rules

Deployment is single-threaded.

Only the deployment agent or lead integrator may deploy.

Before preview deploy:

- changed files are understood
- local lint/test/build passed
- scope is clear
- no unrelated dirty files are included silently

Before production deploy:

- preview was reviewed
- user explicitly approved production
- build source is clean or intentionally scoped
- deploy target is confirmed
- live URL is checked after deploy

Do not claim "done and deployed" from local checks alone.

Report separately:

- local lint/test/build
- Supabase migration status
- Netlify deploy ID
- preview URL
- production URL
- custom-domain HTTP check
- SPA route check where relevant

## Parallel Work Rules

Parallel work is allowed when scopes do not overlap.

Good parallel work:

- UI/UX agent defines component specs
- frontend agent builds isolated primitives
- marketing/story agent drafts share-card tone
- QA agent prepares test checklist
- deployment agent inspects current Netlify state

Bad parallel work:

- two agents editing `src/App.css`
- two agents editing `src/lib/api.ts`
- multiple agents adding migrations in the same phase
- one agent changing routes while another changes preview routing
- deployment while feature agents are still changing files

## First Recommended Parallel Sprint

For UI/UX Phase 1: Design System Foundation, use these lanes:

1. **Token And Surface Owner**
   Owns arena tokens, color roles, borders, shadows, and typography classes.

2. **Primitive UI Owner**
   Owns base UI variants for buttons, cards, badges, inputs, and page shells.

3. **Sports Components Owner**
   Owns reusable sports components such as live chips, scoreboard tiles, player stat tiles, section headers, and story cards.

4. **Preview Lab Owner**
   Owns a reviewable preview surface showing the design system before real route rewrites.

5. **QA Owner**
   Owns mobile/desktop checks, lint/test/build, and scope review.

Do not rewrite `DashboardPage`, `ClubHomePage`, or landing page during this first sprint.

## Handoff Requirements

Every agent final handoff must include:

- role
- branch/worktree
- phase
- scope
- files changed
- files intentionally not touched
- verification run
- verification not run
- risks
- next recommended step

The lead agent must update the owner-facing phase control document after each completed phase or meaningful handoff.

## Owner Approval Points

The human owner must approve:

- phase scope
- visual preview direction
- public landing changes
- database live migration
- production deployment
- changes to true north
- changes to monetization/community-free principle

## Current Default For KelabSukan

Default team size:

- one lead/integrator
- three to five active specialist agents

Default release style:

- preview-first
- production only after explicit approval

Default next implementation:

- UI/UX Phase 1: Design System Foundation

Do not start with landing page.
