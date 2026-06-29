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

All UI elements must utilize the CSS theme variables defined in [index.css](file:///Users/abc/Documents/Badminton%20v2/src/index.css) instead of arbitrary hardcoded Tailwind colors (e.g. `text-slate-900`, `bg-slate-50`) or generic SaaS alerts.

### Dual-Theme (Light & Dark) Constraints
KelabSukan supports both **Light** and **Dark** themes via CSS custom variables. Any hardcoded colors will break when the user toggles the theme.

- **Theme Background (`var(--arena-bg)`)**:
  - *Dark Theme:* `#040d0f` (stadium environment)
  - *Light Theme:* `#f8fafc` (clean grey-white)
- **Primary Accent (`var(--arena-accent)` / `var(--arena-lime)`)**:
  - *Dark Theme:* Neon Electric Lime (`#ccff00`)
  - *Light Theme:* High-Contrast Dark Lime/Green (`#65a30d`) to ensure text remains legible on light backgrounds.
- **Surfaces**: Use `var(--arena-surface)` (Standard card/section backgrounds), `var(--arena-surface-elevated)` (Elevated cards/popups), or `var(--arena-surface-muted)` (Neutral blocks) instead of specific Tailwind gray/slate classes.
- **Borders (`var(--arena-border)`)**: Thin semi-transparent borders. Glow effects must be subtle and controlled.
- **Strictly Avoid Hardcoded Alerts/Text**:
  - *Incorrect (Invisible in dark mode or clashes with light theme):* `text-slate-900`, `hover:text-slate-900`, `bg-red-50 text-red-700 border-red-200`.
  - *Correct (Theme-aware and contrast-compliant):* `text-[var(--arena-text)]`, `hover:text-[var(--arena-text)]`, and theme-aware styling classes for notifications/errors:
    - *Dark error badge:* `bg-red-950/40 text-red-400 border border-red-900/30`
    - *Light error badge:* `bg-red-50 text-red-700 border border-red-100`

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

## 5. Density, Scrolling & Information Fit

KelabSukan is used during live club sessions and competition management, often on phones. Repeated UI blocks must prioritize fast scanning and reduced scrolling before decorative spaciousness.

- **Repeated Lists Must Be Compact**: Rosters, matchups, feeds, score rows, standings, and member lists should default to compact list rows instead of tall standalone cards.
- **Mobile Row Height Target**: A normal repeated row should usually fit in `48px` to `72px`. Use larger rows only when the item has media, controls, or genuinely multi-line content.
- **Padding & Gaps**: For repeated rows, start from `p-2`, `p-2.5`, or `px-3 py-2` with `gap-2`. Avoid `p-4`, `space-y-4`, or stacked rank/status elements unless the content needs that height.
- **Inline Metadata**: Rank chips, status badges, action icons, and scores should sit inline with the primary text when possible, not stacked above it.
- **Viewport Check**: On a 390px-wide mobile viewport, a repeated-list screen should show several usable items at once. If three simple rows fill most of the screen, the layout is too tall.
- **Living Rulebook**: When a UI/UX lesson is learned from review, add it to this design rules file under the closest matching section so future work inherits it.

## 6. Typography Rules

To reinforce the sports broadcast newsroom look and feel, follow these typographic standards:

- **Body Text:** Use `font-sans` (mapped to `'Geist Variable'` or Inter) for maximum legibility. Set line-height to `leading-relaxed` for longer descriptions.
- **Sports Headline Styles (ESPN/Athletic look):** All titles (match headlines, player names, section headers, notice board announcements) must use:
  - `font-black` (or `font-extrabold`) for heavy visual weight.
  - `uppercase` casing to convey energy and high importance.
  - `tracking-tight` (or `tracking-tighter` for large sizes) to compact the letter spacing.
- **Numeric Data (Scores, Elo, Rankings, Dates):** Must always use `font-mono` (monospace) so that numbers line up vertically and do not wobble or cause layout layout reflows when updating dynamically (e.g. `font-mono font-bold`).
- **Sizing Hierarchy for Mobile Viewports:**
  - Page Titles: `text-xl` or `text-2xl` maximum on inner pages. Only the landing hero title may use `text-3xl` or `text-4xl`.
  - Component Titles: `text-sm` or `text-base` bold.
  - Metadata / Badges / Labels: `text-[10px]` or `text-xs` to conserve vertical space.
  - Scores / Primary Rankings: `text-lg` or `text-xl` bold monospace.

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
