---
name: design-rules
description: Visual styling, tokens, and UI/UX design rules for the KelabSukan platform. Use this skill when creating, modifying, or reviewing frontend UI pages, layouts, buttons, cards, and theme alignments.
license: MIT
metadata:
  author: KelabSukan Team
  version: "1.0.0"
---

# KelabSukan UI/UX & Theme Design Rules

This skill defines the visual rules and layout standards for the KelabSukan platform (Live Sports Network). All UI changes must comply with these guidelines to prevent style drift and maintain a premium, mobile-first visual experience.

## When to Apply

Reference these guidelines when:
- Creating new screens or feature components
- Modifying page headers, navigation tabs, or dashboard layout
- Styling progress bars, notifications, alerts, or banners
- Adding buttons, cards, badges, or input fields
- Selecting colors and CSS theme tokens

## 1. Visual Theme & Colors (Arena System)

All UI elements must utilize the CSS theme variables defined in [index.css](file:///Users/abc/Documents/Badminton%20v2/src/index.css) instead of arbitrary hardcoded Tailwind colors or generic SaaS alerts.

### Color Guidelines
- **Electric Lime (`var(--arena-lime)` / `var(--arena-accent)` - `#ccff00`)**: Reserved for actions, live status, winning highlights, and primary CTAs.
- **Electric Blue (`var(--arena-blue)` - `#38bdf8`)**: Used for system highlights, navigation indicators, links, and minor live elements.
- **Theme Background (`var(--arena-bg)` - `#040d0f`)**: A dark arena/stadium environment.
- **Surfaces**:
  - `var(--arena-surface)` (`#0a0f0e`): Standard card/section backgrounds.
  - `var(--arena-surface-elevated)` (`#1e293b`): Elevated cards or popups.
  - `var(--arena-surface-muted)` (`#1b2435`): Neutral background blocks.
- **Borders (`var(--arena-border)`)**: Thin semi-transparent borders. Glow effects must be subtle and controlled.
- **Avoid Mismatching Alerts**: Do not use standard bootstrap or generic alert colors (e.g., standard yellow/amber for notifications or progress cards) that contrast with the sports-broadcast dark theme.
  - *Incorrect*: `border-amber-500 bg-amber-50 text-amber-800`
  - *Correct*: `border-[var(--arena-accent)]/20 bg-[var(--arena-surface-elevated)]/30 text-[var(--arena-text)]` with a custom lime glow.

## 2. Mobile-First Page Header Actions

To maximize horizontal space on smaller screens and ensure premium layout behavior, the following rules apply to page headers:

- **Icon-Only Buttons for Actions**: All actions displayed in the actions area of a `<PageHeader>` must be icon-only on mobile.
  - Use `size="icon"` and the custom class: `h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg`.
  - Include descriptive `title` tags (e.g., `title="Edit Card"`) for tooltips and accessibility.
- **Text Labels in Headers**: Avoid rendering text label spans next to header icons on mobile. If desired on larger screens, hide the label on small viewports with `className="hidden sm:inline"`.

## 3. Quick Action Grids & Navigation

Quick actions (e.g., dashboard shortcuts) must look like native app grid options:
- Keep grid options balanced (e.g., `grid-cols-3` or `grid-cols-2`).
- Prevent horizontal text truncation. Design elements to either stack vertically (`flex flex-col items-center gap-1.5 p-2`) or use icon-only representations with labels underneath.
- Backgrounds should use matching theme surfaces (`var(--arena-surface-elevated)` or `var(--arena-accent)` for the primary action).

## 4. Cards & Badges

- **Card Styles**: Use custom arena cards. Keep border radiuses compact (around `8px` to `12px` maximum) with subtle borders.
- **Status Badges**: Use custom status badges styled with theme variables:
  - Active/Live: `bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-[var(--arena-accent)]/20`
  - Neutral/Locked: `bg-[var(--arena-surface-muted)] text-[var(--arena-text-dim)] border border-[var(--arena-border)]`

## Code Examples

### Incorrect Header Action (Drifts to large text boxes on mobile)
```tsx
<PageHeader
  title="My Page"
  actions={
    <Button variant="secondary" onClick={handleEdit}>
      <Edit3 size={13} />
      <span>Edit Card</span>
    </Button>
  }
/>
```

### Correct Header Action (Icon button optimized for mobile-first UI)
```tsx
<PageHeader
  title="My Page"
  actions={
    <Button
      variant="secondary"
      size="icon"
      onClick={handleEdit}
      className="h-8 w-8 min-h-0 p-0 flex items-center justify-center cursor-pointer rounded-lg"
      title="Edit Card"
    >
      <Edit3 size={14} aria-hidden="true" />
    </Button>
  }
/>
```
