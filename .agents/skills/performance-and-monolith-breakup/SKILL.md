---
name: performance-and-monolith-breakup
description: Guidelines for splitting api.ts, refactoring large screens, and optimizing app queries using database RPCs.
license: MIT
metadata:
  author: KelabSukan Team
  version: "1.0.0"
---

# KelabSukan Monolith Breakup & Performance Optimization Rules

This skill provides directions for modularizing the KelabSukan codebase and optimizing network/database fetch paths. Use this skill when refactoring bulky files (e.g., `api.ts` or large UI modals) or applying performance updates.

## When to Apply

Reference these guidelines when:
- Splitting the [api.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api.ts) file or modifying core API helper functions
- Working with the player dashboard query logic
- Modularizing component code exceeding 800 lines (e.g., `ScoreRecordingModal.tsx`)
- Resolving query fan-out or database latency issues

---

## 1. Domain-Driven API Refactoring

The core `api.ts` file must be modularized into domain files under `src/lib/api/` to improve compile times and maintainability.

### Module Structures:
- [clubs.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api/clubs.ts): Club membership, details, rosters, invite generation.
- [matches.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api/matches.ts): Match recording, head-to-head records, score tracking.
- [events.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api/events.ts): Session dates, RSVP lists, check-in controls.
- [profiles.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api/profiles.ts): Player profiles, settings updates, career metrics.
- [notifications.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api/notifications.ts): Subscriptions and push alert mappings.
- [index.ts](file:///Users/abc/Documents/Badminton%20v2/src/lib/api/index.ts): Main barrel export representing the unified API interface.

> [!WARNING]
> When splitting API modules, preserve existing function signatures exactly. Do not alter parameters or return types unless doing so is part of an approved database migration phase.

---

## 2. Eliminating Query Fan-out: Player Dashboard RPC

Do not fetch member lists, matches, and profile states in parallel loops on page mount. Instead, call the dedicated player dashboard RPC.

### Code Pattern:
*Incorrect (Fan-out Query)*:
```tsx
const clubs = await getPlayerClubs(userId);
// Renders parallel API fetches for each club, leading to heavy database locks
const matches = await Promise.all(clubs.map(c => getClubMatches(c.id)));
```

*Correct (Single RPC Fetch)*:
```tsx
const { data, error } = await supabase.rpc('get_player_dashboard', {
  p_user_id: userId
});
// Destructure computed statistics, recent matchups, and user profile state
```

---

## 3. Modularizing Large Components

UI files exceeding 800 lines (e.g. `SuperAdminAnalyticsPage.tsx` or `ScoreRecordingModal.tsx`) represent high technical debt and must be split:

- **Extract State & Hooks**: Pull complex UI state (form validations, score counting states) out into local custom hooks (e.g., `useScoreRecorder.ts`).
- **Isolate Sub-Components**: Break down giant modal markup trees into smaller sub-components (e.g., `ScoreEntryGrid.tsx`, `ParticipantSelector.tsx`) stored in a dedicated component sub-folder.
- **Maintain Clean Interfaces**: Sub-components should pass data through explicit props instead of referencing parent context variables directly.
