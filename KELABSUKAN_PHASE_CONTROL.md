# KelabSukan Phase Control

## Purpose

This is the owner-facing control board for KelabSukan development.

Use this file to track:

- current phase
- owner decisions needed
- production status
- preview status
- agent handoffs
- verification evidence

Keep this file plain and operational. It is not the product vision. Product vision remains in `KELABSUKAN_TRUE_NORTH.md`.

## Current Snapshot

Last updated: 2026-06-16

Current strategic focus:

> UI/UX systemization before more page redesign.

Current implementation rule:

> Build foundation first, preview second, real routes third, production only after approval.

Production status:

- Production site exists at `https://kelabsukan.com`.
- Do not claim current production state from local checks alone.
- Any new production release must report Netlify deploy ID and live URL verification.

Current local caution:

- The workspace has existing uncommitted UI changes.
- New work should avoid silently mixing with those changes.
- Multi-agent work should use separate branches/worktrees.

## Phase Summary

| Phase | Status | Owner Outcome | Latest Evidence | Next Decision |
|---|---|---|---|---|
| Product True North | Active Canon | Product direction is defined as grassroots sports media / Live Sports Network | `KELABSUKAN_TRUE_NORTH.md` | Keep as canon |
| UI/UX Requirements | Active Canon | Screen goals, visual direction, story/share requirements are defined | `KELABSUKAN_UIUX_REQUIREMENTS.md` | Use for UI work |
| UI/UX Phase 0: Execution Framework | In Progress | Development rules and phase gates are being documented | `KELABSUKAN_UIUX_EXECUTION_FRAMEWORK.md` | Review and commit |
| AI Agent Operating Model | In Progress | Multi-agent roles, Git/worktree rules, and ownership model are being documented | `KELABSUKAN_AI_AGENT_OPERATING_MODEL.md` | Review and commit |
| UI/UX Phase 1: Design System Foundation | Implemented Locally | Reusable visual foundation before real page redesign | `/ui-preview`, lint/test/build, mobile/desktop overflow check | Owner visual review |
| UI/UX Phase 2: Preview Lab | Started | Safe review surface for components before production routes | `/ui-preview` local route | Review and refine |
| Player Card | Implemented Locally | Make player identity the atomic media asset | Reusable `PlayerIdentityCard` exists in preview and dashboard; lint/test/build passed | Owner visual review on real dashboard |
| Player Home / Dashboard | Started | Make signed-in home personal and status-driven | Dashboard now uses the shared player identity card; existing dirty local work still exists | Review player card integration before broader dashboard changes |
| Competitions System (Weeks 1-3) | In Progress | Unified competitions schema, BWF broadcast-style scoreboards, pool standings, and SVG playoff bracket trees | Database migrations & competitions API complete; detail pages & bracket view in progress | Complete Week 2 & 3 UI implementation |
| Club Homepage | Planned | Make clubs feel like sports channels | Not started in new framework | Wait for foundation |
| Game Day Live | Planned | Make sessions feel live and usable beside court | Not started in new framework | Wait for foundation |
| Story / Share Cards | Planned | Turn stats into shareable stories | Requirements documented | Wait for core surfaces |
| Landing Page Public Sports Front Page | Deferred | Public media surface after internal language stabilizes | Previous redesign was rolled back | Do not start yet |
| Admin Command Center | Planned | Efficient admin without admin-first product feel | Not started in new framework | Wait for foundation |

## Open Decisions

| Date | Phase | Decision | Owner Approved? | Notes |
|---|---|---|---|---|
| 2026-06-07 | UI/UX governance | Use phase-gated execution instead of trial-and-error redesign | Yes | Framework created |
| 2026-06-07 | AI collaboration | Use small specialist AI team with Git/worktree isolation | Yes | Operating model created |
| 2026-06-07 | Next build phase | Start with Design System Foundation, not landing page | Yes | Implemented locally with `/ui-preview` |

## Agent Role Board

| Role | Current Owner | Current Scope | Allowed To Edit | Blocked From |
|---|---|---|---|---|
| Lead / Integrator | Current main Codex thread | Coordinate scope, docs, handoffs, integration | Assigned docs and integration files | Dirty unrelated files without approval |
| AI Project Manager | Unassigned | Phase specs, acceptance criteria, owner updates | Docs only | App code, DB, deploy |
| Principal Engineer | Unassigned | Architecture, ownership, merge order | Architecture docs, assigned code review | Visual taste decisions alone |
| UI/UX Agent | Unassigned | Screen purpose, component spec, visual hierarchy | UI specs, preview-only work if assigned | Production routes without approval |
| Senior Frontend Agent | Unassigned | React implementation and components | Assigned frontend files | Supabase and deploy |
| Backend / Supabase Agent | Unassigned | Migrations, RLS, RPCs, API contract | Assigned migrations/API/types | UI styling and deploy |
| QA Agent | Unassigned | Verification and regression checks | Test/check reports | Scope changes and deploy |
| Deployment Agent | Unassigned | Preview/prod deploy after approval | Deployment checklist and deploy commands | Dirty/unapproved releases |
| Marketing / Story Agent | Unassigned | Story tone, captions, public editorial rules | Copy/story docs | App architecture and private data decisions |

## Active Handoffs

| Date | Agent/Thread | Phase | Scope | Files Changed | Verification | Owner Handoff |
|---|---|---|---|---|---|---|
| 2026-06-07 | Main Codex thread | UI/UX Phase 0 | Create execution framework | `KELABSUKAN_UIUX_EXECUTION_FRAMEWORK.md` | Markdown review only | Framework ready for review |
| 2026-06-07 | Main Codex thread | AI Operating Model | Create multi-agent workflow rules | `KELABSUKAN_AI_AGENT_OPERATING_MODEL.md`, `KELABSUKAN_PHASE_CONTROL.md` | Markdown review only | Operating model ready for review |
| 2026-06-07 | Main Codex thread | UI/UX Phase 1 | Draft design system foundation spec | `KELABSUKAN_UIUX_PHASE_1_DESIGN_SYSTEM_SPEC.md`, `KELABSUKAN_PHASE_CONTROL.md` | Markdown review only | Phase 1 spec ready for review |
| 2026-06-07 | Main Codex thread | UI/UX Phase 1 | Implement design tokens, primitive variants, sports/admin components, and `/ui-preview` | `src/index.css`, `src/App.css`, `src/components/ui/*`, `src/components/sports.tsx`, `src/components/admin/AdminPrimitives.tsx`, `src/pages/UiPreviewPage.tsx`, `src/App.tsx` | lint/test/build passed; local mobile/desktop overflow check passed | Review local `/ui-preview` before any production route changes |
| 2026-06-07 | Main Codex thread | Player Card | Extract player identity card into a reusable component and wire it into the signed-in dashboard | `src/components/sports.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/UiPreviewPage.tsx` | lint/test/build passed | Review dashboard player card before expanding the rest of player home |
| 2026-06-16 | Main Codex thread | Competitions System Review | Review current friendly-to-competition migration and fix invite preview host-club name | `src/components/friendly/FriendlyCreateModal.tsx`, `src/pages/FriendliesListPage.tsx` | lint/test/build passed | Keep legacy friendly aliases until competition migration is fully settled |

## Verification Log

| Date | Scope | Local Checks | Preview | Production | Notes |
|---|---|---|---|---|---|
| 2026-06-07 | UI/UX framework docs | Not run; docs only | Not required | Not required | No app code changed |
| 2026-06-07 | AI operating docs | Not run; docs only | Not required | Not required | No app code changed |
| 2026-06-07 | Phase 1 design system spec | Not run; docs only | Not required | Not required | No app code changed |
| 2026-06-07 | Phase 1 design system foundation | `npm run lint`, `npm run test`, `npm run build` passed | Local `/ui-preview` checked at 390px and 1440px; no horizontal overflow; no console errors | Not deployed | Existing bundle-size warning remains; no production deploy |
| 2026-06-07 | Player card first integration | `npm run lint`, `npm run test`, `npm run build` passed | Not checked visually after integration | Not deployed | Dashboard now consumes shared `PlayerIdentityCard`; existing bundle-size warning remains |
| 2026-06-16 | Codebase review/refactor | `npm run lint`, `npm run test` passed: 43 tests; `npm run build` passed | Not checked visually in browser | Not deployed | Build still reports existing large main bundle and ineffective dynamic import warning |

## Production Release Checklist

Before any production deploy, confirm:

- scope is clear
- changed files are known
- unrelated dirty files are excluded
- lint passes
- tests pass
- build passes
- preview URL was reviewed
- Supabase migration status is known if data changed
- Netlify target is confirmed
- user explicitly approved production
- live production URL was checked after deploy

## Next Recommended Step

Review the local `/ui-preview` design-system foundation and signed-in dashboard player card.

Do not begin landing-page redesign.

The next phase should refine the player home/dashboard around the approved player-card foundation.

Do not apply this system to landing page yet.
